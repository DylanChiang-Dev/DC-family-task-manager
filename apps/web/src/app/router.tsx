import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
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
          { path: "/categories", element: <CategoriesPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
