import { Link } from "react-router-dom";
import {
  Award,
  Heart,
  Leaf,
  Users,
  Shield,
  Gem,
  ShoppingBag,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Company values data
const values = [
  {
    icon: Award,
    title: "Premium Quality",
    description:
      "We source only the finest wool and materials, ensuring every piece meets our exacting standards for softness, durability, and warmth.",
  },
  {
    icon: Heart,
    title: "Artisan Craftsmanship",
    description:
      "Our skilled artisans bring decades of expertise to every garment, preserving traditional techniques while embracing innovation.",
  },
  {
    icon: Leaf,
    title: "Sustainable Practices",
    description:
      "We are committed to ethical sourcing and eco-friendly production methods that respect both our artisans and the environment.",
  },
  {
    icon: Users,
    title: "Customer First",
    description:
      "Your satisfaction drives everything we do. From design to delivery, we ensure an exceptional experience at every touchpoint.",
  },
  {
    icon: Shield,
    title: "Trust & Transparency",
    description:
      "We believe in honest pricing, clear communication, and standing behind every product we sell with our quality guarantee.",
  },
  {
    icon: Gem,
    title: "Timeless Design",
    description:
      "Our designs blend classic elegance with contemporary style, creating pieces that remain fashionable season after season.",
  },
];

const AboutUs = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-zinc-900 text-white py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605218427368-35b866509a25?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
        
        <div className="container relative mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <Badge variant="outline" className="text-white border-white/30 backdrop-blur-sm px-4 py-1.5 text-sm tracking-widest uppercase">
              Established 2013
            </Badge>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
              Weaving Stories in <span className="text-primary-foreground italic">Wool</span>
            </h1>
            <p className="text-xl lg:text-2xl text-zinc-300 leading-relaxed max-w-2xl mx-auto font-light">
              From the heart of Ludhiana to your wardrobe, bringing you premium woolens that blend heritage with modern elegance.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 lg:py-32 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-7xl mx-auto">
            {/* Image/Visual Side */}
            <div className="relative order-2 lg:order-1 group">
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative rounded-3xl overflow-hidden border border-border/50 shadow-2xl">
                <div className="aspect-[4/5] relative bg-muted">
                  <img 
                    src="https://images.unsplash.com/photo-1574201635302-388dd92a4c3f?q=80&w=1965&auto=format&fit=crop"
                    alt="Artisan working with wool"
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-8 left-8 text-white">
                    <div className="flex items-center gap-3 mb-2">
                      <Sparkles className="h-5 w-5 text-yellow-200" />
                      <span className="text-sm font-medium tracking-wider uppercase text-yellow-200">Heritage</span>
                    </div>
                    <p className="text-2xl font-serif italic">"Quality is not an act, it is a habit."</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Side */}
            <div className="space-y-8 order-1 lg:order-2">
              <div className="space-y-4">
                <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
                A Legacy Woven in Wool
                </h2>
                <div className="w-20 h-1 bg-primary rounded-full" />
              </div>
              
              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                <p className="drop-cap first-letter:text-5xl first-letter:font-serif first-letter:mr-3 first-letter:float-left first-letter:text-primary">
                  Nidhi Sweaters was founded in 2013 in Ludhiana, Punjab — the
                  heart of India's woolen textile industry. What began as a
                  small family workshop has grown into a trusted name in premium
                  woolen apparel.
                </p>
                <p>
                  For nearly four decades, we have been dedicated to the art of
                  crafting exceptional woolens. Our skilled artisans combine
                  time-honored techniques with modern designs to create pieces
                  that are both timeless and contemporary.
                </p>
                <div className="flex items-center gap-4 pt-4">
                  <div className="pl-4 border-l-2 border-primary">
                    <p className="font-semibold text-foreground">10K+</p>
                    <p className="text-sm">Happy Customers</p>
                  </div>
                  <div className="pl-4 border-l-2 border-primary">
                    <p className="font-semibold text-foreground">40+</p>
                    <p className="text-sm">Years Experience</p>
                  </div>
                  <div className="pl-4 border-l-2 border-primary">
                    <p className="font-semibold text-foreground">100%</p>
                    <p className="text-sm">Quality Guarantee</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Values Section */}
      <section className="py-20 lg:py-32 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl lg:text-5xl font-bold mb-6 tracking-tight">
                Our Mission & Values
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Every thread we weave carries our commitment to quality,
                sustainability, and the preservation of traditional
                craftsmanship.
              </p>
            </div>

            {/* Values Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {values.map((value, index) => (
                <Card key={index} className="h-full border-none shadow-lg hover:shadow-xl transition-shadow duration-300 bg-background/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="p-4 bg-primary/5 rounded-2xl w-fit mb-4">
                      <value.icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* Call-to-Action Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-fixed opacity-10 mix-blend-overlay" />
        
        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl lg:text-6xl font-bold text-white tracking-tight">
              Experience the Nidhi Difference
            </h2>
            <p className="text-xl text-primary-foreground/90 leading-relaxed max-w-2xl mx-auto font-light">
              Discover our collection of premium woolens, crafted with care in
              Ludhiana and delivered to your doorstep. Join thousands of
              satisfied customers who trust Nidhi Sweaters for quality and
              style.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                asChild
                size="lg"
                className="bg-white text-primary hover:bg-zinc-100 font-semibold h-14 px-8 text-lg rounded-full"
              >
                <Link to="/shop">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Shop Collection
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-white/30 text-white bg-transparent hover:bg-white/10 hover:text-white h-14 px-8 text-lg rounded-full backdrop-blur-sm"
              >
                <Link to="/contact-us">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Get in Touch
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default AboutUs;
