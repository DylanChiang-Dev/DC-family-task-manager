import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { CalendarPage } from "@/features/calendar/CalendarPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { SettingsPage } from "@/features/profile/SettingsPage";
import { TaskListPage } from "@/features/tasks/TaskListPage";
import { TaskDetailPage } from "@/features/tasks/TaskDetailPage";

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <TaskListPage /> },
          { path: "/tasks", element: <Navigate to="/" replace /> },
          { path: "/tasks/:id", element: <TaskDetailPage /> },
          { path: "/calendar", element: <CalendarPage /> },
          { path: "/categories", element: <CategoriesPage /> },
          { path: "/notifications", element: <NotificationsPage /> },
          { path: "/settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
