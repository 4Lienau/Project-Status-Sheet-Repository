import React from "react";

const Footer = () => {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <div className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          <p>
            © ReWa {new Date().getFullYear()} Project Status Sheets. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
