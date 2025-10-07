const Footer = () => {
  const footerLinks = {
    Shop: ["New Arrivals", "Mens", "Womens", "Sale"],
    Company: ["About Us", "Careers", "Store Locator", "Contact"],
    Support: ["FAQ", "Shipping", "Returns", "Size Guide"],
  };

  return (
    <footer className="bg-foreground text-background py-16 lg:py-20">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          <div className="col-span-2 lg:col-span-1">
            <h3 className="text-2xl font-bold mb-4">BLOCKHAUS.</h3>
            <p className="text-background/70 text-sm">
              Redefining urban streetwear with bold designs and premium quality.
            </p>
          </div>
          
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-bold mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-background/70 hover:text-background transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-background/20 pt-8 flex flex-col lg:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/70">
            © 2024 BLOCKHAUS. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-background/70 hover:text-background transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-background/70 hover:text-background transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
