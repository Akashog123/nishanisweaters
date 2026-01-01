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
      <section className="bg-primary text-primary-foreground py-16 lg:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              OUR STORY
            </Badge>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 tracking-tight">
              Crafting Warmth Since 2013
            </h1>
            <p className="text-lg lg:text-xl text-primary-foreground/80 leading-relaxed">
              From the heart of Ludhiana, Punjab — India's woolen capital — we
              bring you premium handcrafted woolens that blend tradition with
              contemporary style.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-12 lg:py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center max-w-6xl mx-auto">
            {/* Image/Visual Side */}
            <div className="relative order-2 lg:order-1">
              <Card className="overflow-hidden">
                <div className="aspect-[4/3] bg-secondary relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">
                        Heritage Since 2013
                      </p>
                    </div>
                  </div>
                  {/* Decorative grid overlay */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
                      backgroundSize: "40px 40px",
                    }}
                  />
                </div>
              </Card>
            </div>

            {/* Content Side */}
            <div className="space-y-6 order-1 lg:order-2">
              <Badge variant="outline">OUR JOURNEY</Badge>
              <h2 className="text-3xl lg:text-4xl font-bold">
                A Legacy Woven in Wool
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Nishani Woolera was founded in 2013 in Ludhiana, Punjab — the
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
                <p>
                  Today, we serve customers across India and beyond, bringing
                  the warmth and quality of Ludhiana's finest woolens to homes
                  everywhere.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Values Section */}
      <section className="py-12 lg:py-20 bg-secondary/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                WHAT WE STAND FOR
              </Badge>
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">
                Our Mission & Values
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Every thread we weave carries our commitment to quality,
                sustainability, and the preservation of traditional
                craftsmanship.
              </p>
            </div>

            {/* Values Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.map((value, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="p-3 bg-primary rounded-lg w-fit mb-2">
                      <value.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-lg">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-relaxed">
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
      <section className="py-16 lg:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Experience the Nishani Difference
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 leading-relaxed">
              Discover our collection of premium woolens, crafted with care in
              Ludhiana and delivered to your doorstep. Join thousands of
              satisfied customers who trust Nishani Woolera for quality and
              style.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="font-semibold"
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
                className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
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
