<?php
/**
 * Team Helper Functions
 * Utility functions for team management
 */

class TeamHelper
{
    /**
     * Generate a unique 6-character invite code
     * Uses uppercase letters and numbers, excludes confusing characters (0, O, I, 1)
     */
    public static function generateInviteCode($db)
    {
        $characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude 0, O, I, 1
        $maxAttempts = 10;
        $attempts = 0;

        do {
            $code = '';
            for ($i = 0; $i < 6; $i++) {
                $code .= $characters[random_int(0, strlen($characters) - 1)];
            }

            // Check if code already exists
            $stmt = $db->prepare("SELECT id FROM teams WHERE invite_code = ?");
            $stmt->execute([$code]);
            $exists = $stmt->fetch();

            $attempts++;
        } while ($exists && $attempts < $maxAttempts);

        if ($exists) {
            // Fallback: use timestamp-based code
            $code = strtoupper(substr(md5(microtime()), 0, 6));
        }

        return $code;
    }

    /**
     * Check if user is a member of a team
     */
    public static function isTeamMember($db, $userId, $teamId)
    {
        $stmt = $db->prepare("SELECT id FROM team_members WHERE team_id = ? AND user_id = ?");
        $stmt->execute([$teamId, $userId]);
        return $stmt->fetch() !== false;
    }

    /**
     * Check if user is an admin of a team
     */
    public static function isTeamAdmin($db, $userId, $teamId)
    {
        $stmt = $db->prepare("SELECT id FROM team_members WHERE team_id = ? AND user_id = ? AND role = 'admin'");
        $stmt->execute([$teamId, $userId]);
        return $stmt->fetch() !== false;
    }

    /**
     * Get user's role in a team
     * Returns 'admin', 'member', or null if not a member
     */
    public static function getUserTeamRole($db, $userId, $teamId)
    {
        $stmt = $db->prepare("SELECT role FROM team_members WHERE team_id = ? AND user_id = ?");
        $stmt->execute([$teamId, $userId]);
        $result = $stmt->fetch();
        return $result ? $result['role'] : null;
    }

    /**
     * Get all teams for a user
     */
    public static function getUserTeams($db, $userId)
    {
        $stmt = $db->prepare("
            SELECT t.*, tm.role
            FROM teams t
            INNER JOIN team_members tm ON t.id = tm.team_id
            WHERE tm.user_id = ?
            ORDER BY t.created_at DESC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    /**
     * Validate invite code and get team info
     */
    public static function getTeamByInviteCode($db, $inviteCode)
    {
        $stmt = $db->prepare("SELECT * FROM teams WHERE invite_code = ?");
        $stmt->execute([$inviteCode]);
        return $stmt->fetch();
    }

    /**
     * Add user to team
     */
    public static function addUserToTeam($db, $userId, $teamId, $role = 'member')
    {
        try {
            $stmt = $db->prepare("INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)");
            $stmt->execute([$teamId, $userId, $role]);
            return true;
        } catch (PDOException $e) {
            // Handle duplicate entry error
            if ($e->getCode() == 23000) {
                return false; // Already a member
            }
            throw $e;
        }
    }

    /**
     * Remove user from team
     */
    public static function removeUserFromTeam($db, $userId, $teamId)
    {
        $stmt = $db->prepare("DELETE FROM team_members WHERE team_id = ? AND user_id = ?");
        $stmt->execute([$teamId, $userId]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Get team members
     */
    public static function getTeamMembers($db, $teamId)
    {
        $stmt = $db->prepare("
            SELECT u.id, u.username, u.nickname, tm.role, tm.joined_at
            FROM users u
            INNER JOIN team_members tm ON u.id = tm.user_id
            WHERE tm.team_id = ?
            ORDER BY tm.role DESC, tm.joined_at ASC
        ");
        $stmt->execute([$teamId]);
        return $stmt->fetchAll();
    }

    /**
     * Switch user's current team
     */
    public static function switchTeam($db, $userId, $teamId)
    {
        // Verify user is a member of the team
        if (!self::isTeamMember($db, $userId, $teamId)) {
            return false;
        }

        $stmt = $db->prepare("UPDATE users SET current_team_id = ? WHERE id = ?");
        $stmt->execute([$teamId, $userId]);
        return true;
    }
}
