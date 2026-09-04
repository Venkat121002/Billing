import React from "react";

import AdminLayout from "./AdminLayout";


const Layout = ({ children, isAdmin }) => {
  if (isAdmin) {
    return <AdminLayout>{children}</AdminLayout>;
  }

  return (
    <div className="relative min-h-screen dark:bg-gray-900 transition-colors">
      {children}
    </div>
  );
};

export default Layout;
