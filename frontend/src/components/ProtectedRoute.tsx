import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Role } from "../api/endpoints";

export function ProtectedRoute({ children, roles }: { children: JSX.Element; roles?: Role[] }) {
  const { user, token } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="empty-state">
        <h3>Access restricted</h3>
        <p>Your role ({user.role}) doesn't have access to this section.</p>
      </div>
    );
  }

  return children;
}
