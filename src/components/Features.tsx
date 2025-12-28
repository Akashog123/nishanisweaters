import { Truck, ShieldCheck, RotateCcw, Headphones } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Truck,
      title: "FREE DELIVERY",
    },
    {
      icon: ShieldCheck,
      title: "100% SECURE PAYMENT",
    },
    {
      icon: RotateCcw,
      title: "7 DAYS RETURN",
    },
    {
      icon: Headphones,
      title: "24/7 SUPPORT",
    },
  ];

  return (
    <section className="py-16 lg:py-20 bg-white">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center space-y-4"
            >
              <feature.icon className="w-12 h-12 lg:w-16 lg:h-16 stroke-[1.5]" />
              <h3 className="font-bold text-sm lg:text-base">
                {feature.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
