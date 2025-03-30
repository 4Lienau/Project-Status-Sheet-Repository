/**
 * File: Footer.tsx
 * Purpose: Footer component for the application layout
 * Description: This component renders the application footer with copyright information.
 * It's a simple component that provides consistent footer styling across the application.
 *
 * Called by: src/components/layout/Layout.tsx (likely)
 */

const Footer = () => {
  return (
    <footer className="bg-gray-200 border-t border-gray-300">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center">
          <p className="text-sm text-gray-600">
            © ReWa 2025 Project Status Sheets. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
