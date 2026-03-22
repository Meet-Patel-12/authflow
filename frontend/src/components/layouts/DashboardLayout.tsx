import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const sideW = collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)";

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-base)" }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <div
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: sideW }}>
        <Header />
        <main className="flex-1 p-6 bg-grid">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
