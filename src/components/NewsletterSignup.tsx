import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

const NewsletterSignup = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success("Thanks for subscribing! Check your email for your 15% off code.");
      setEmail("");
    }
  };

  return (
    <section className="py-16 lg:py-24 bg-secondary">
      <div className="container mx-auto px-4 lg:px-8 max-w-2xl text-center">
        <p className="text-sm font-medium tracking-wider mb-4 text-muted-foreground">
          welcome!
        </p>
        <h2 className="text-2xl lg:text-4xl font-bold mb-8">
          Sign up to newsletter for 15% off your first order!
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-4">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 h-12 px-4 bg-background border-2"
          />
          <Button 
            type="submit" 
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-12 px-8"
          >
            Subscribe
          </Button>
        </form>
        
        <p className="text-xs text-muted-foreground">
          By signing up you are agreeing to our{" "}
          <a href="#" className="underline hover:text-foreground">
            terms
          </a>
          .
        </p>
      </div>
    </section>
  );
};

export default NewsletterSignup;
