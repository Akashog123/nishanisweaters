import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  Send,
  CheckCircle2,
  Loader2
} from "lucide-react";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Contact form validation schema
const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z
    .string()
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .regex(/^[+]?[\d\s\-()]{7,20}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  subject: z.enum(["general", "order_inquiry", "wholesale", "feedback", "other"], {
    required_error: "Please select a subject",
  }),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be less than 1000 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

// Subject options with labels
const subjectOptions = [
  { value: "general", label: "General Inquiry" },
  { value: "order_inquiry", label: "Order Inquiry" },
  { value: "wholesale", label: "Wholesale Partnership" },
  { value: "feedback", label: "Feedback" },
  { value: "other", label: "Other" },
] as const;

// FAQ items
const faqItems = [
  {
    question: "What are your shipping options and delivery times?",
    answer:
      "We offer standard shipping (5-7 business days) and express shipping (2-3 business days) across India. International shipping is available to select countries. Free shipping is available for orders above Rs. 2,999.",
  },
  {
    question: "What is your return and exchange policy?",
    answer:
      "We accept returns and exchanges within 15 days of delivery for unused items in original condition with tags attached. Please contact our support team to initiate a return. Refunds are processed within 7-10 business days after we receive the returned item.",
  },
  {
    question: "How can I become a wholesale partner?",
    answer:
      "We welcome wholesale inquiries from retailers and businesses. Please visit our Wholesale Registration page or select 'Wholesale Partnership' as the subject in the contact form. Our team will review your application and get back to you within 2-3 business days.",
  },
  {
    question: "How do I track my order?",
    answer:
      "Once your order is shipped, you will receive an email with tracking information. You can also track your order by logging into your account and visiting the Order History page.",
  },
  {
    question: "Do you offer custom sizing or alterations?",
    answer:
      "Currently, we offer standard sizes as listed on our product pages. For bulk orders or wholesale partnerships, custom sizing options may be available. Please contact us for more information.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards, UPI, net banking, and popular wallets through our secure payment partner Razorpay. Wholesale customers may also pay via bank transfer or invoice.",
  },
];

// Reusable Contact Info Item Component
interface ContactInfoItemProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const ContactInfoItem = ({ icon, title, children }: ContactInfoItemProps) => (
  <div className="flex items-start gap-4">
    <div className="p-3 bg-secondary rounded-lg shrink-0">
      {icon}
    </div>
    <div>
      <h4 className="font-medium text-sm text-muted-foreground mb-1">
        {title}
      </h4>
      {children}
    </div>
  </div>
);

// WhatsApp Icon Component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const ContactUs = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const submitContactForm = useMutation(api.contact.submitContactForm);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: undefined,
      message: "",
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);

    try {
      await submitContactForm({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        subject: values.subject,
        message: values.message,
      });

      setIsSuccess(true);
      form.reset();
      toast.success("Message sent successfully! We will get back to you soon.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to send message. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendAnother = () => {
    setIsSuccess(false);
    form.reset();
  };

  return (
    <Layout>
      {/* Hero Section - Using primary theme colors */}
      <section className="bg-primary text-primary-foreground py-16 lg:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              WE'RE HERE TO HELP
            </Badge>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 tracking-tight">
              Get in Touch
            </h1>
            <p className="text-lg lg:text-xl text-primary-foreground/80 leading-relaxed">
              Have questions about our products, orders, or wholesale partnerships?
              We are here to help. Reach out to us and our team will respond within 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 lg:py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <div>
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary rounded-lg">
                      <MessageSquare className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-xl lg:text-2xl">
                      Send us a Message
                    </CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    Fill out the form below and we will get back to you as soon.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSuccess ? (
                    <div className="py-8 text-center animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">
                        Message Sent Successfully!
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Thank you for reaching out. Our team will review your message
                        and respond within 24 hours.
                      </p>
                      <Button onClick={handleSendAnother} variant="outline">
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-5"
                      >
                        {/* Name Field */}
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your full name"
                                  {...field}
                                  disabled={isSubmitting}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Email and Phone Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="you@example.com"
                                    {...field}
                                    disabled={isSubmitting}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input
                                    type="tel"
                                    placeholder="+91 98765 43210"
                                    {...field}
                                    disabled={isSubmitting}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Subject Dropdown */}
                        <FormField
                          control={form.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subject *</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={isSubmitting}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a subject" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {subjectOptions.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Message Textarea */}
                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message *</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="How can we help you? Please provide as much detail as possible..."
                                  className="min-h-[140px] resize-none"
                                  {...field}
                                  disabled={isSubmitting}
                                />
                              </FormControl>
                              <FormDescription className="text-xs flex justify-between">
                                <span>Minimum 10 characters</span>
                                <span
                                  className={
                                    field.value.length > 900
                                      ? "text-destructive"
                                      : ""
                                  }
                                >
                                  {field.value.length}/1000
                                </span>
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Submit Button - Using default variant (primary) */}
                        <Button
                          type="submit"
                          size="lg"
                          className="w-full"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending Message...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Send Message
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              {/* Contact Details Card */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl lg:text-2xl">
                    Contact Information
                  </CardTitle>
                  <CardDescription>
                    Reach out to us through any of these channels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Email */}
                  <ContactInfoItem
                    icon={<Mail className="h-5 w-5 text-foreground" />}
                    title="Email Us"
                  >
                    <a
                      href="mailto:support@nishaniwoolera.com"
                      className="text-base font-medium hover:text-primary transition-colors"
                    >
                      support@nishaniwoolera.com
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">
                      We respond within 24 hours
                    </p>
                  </ContactInfoItem>

                  <Separator />

                  {/* Phone */}
                  <ContactInfoItem
                    icon={<Phone className="h-5 w-5 text-foreground" />}
                    title="Call Us"
                  >
                    <a
                      href="tel:+917458816343"
                      className="text-base font-medium hover:text-primary transition-colors"
                    >
                      +91 7458 816 343
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">
                      Mon - Sat, 10:00 AM - 6:00 PM IST
                    </p>
                  </ContactInfoItem>
                  
                  <Separator />

                  {/* Business Hours */}
                  <ContactInfoItem
                    icon={<Clock className="h-5 w-5 text-foreground" />}
                    title="Business Hours"
                  >
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Monday - Saturday:</span>{" "}
                        10:00 AM - 6:00 PM
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Sunday:</span> Closed
                      </p>
                    </div>
                  </ContactInfoItem>
                </CardContent>
              </Card>

              {/* Map Placeholder */}
              <Card className="overflow-hidden">
                <div className="relative h-48 bg-secondary">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Ludhiana, Punjab, India
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
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 lg:py-20 bg-secondary/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-4">
                FAQ
              </Badge>
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground">
                Find quick answers to common questions about orders, shipping, and more.
              </p>
            </div>

            <Card>
              <CardContent className="pt-0 pb-0">
                <Accordion type="single" collapsible className="w-full">
                  {faqItems.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`item-${index}`}
                      className="last:border-b-0"
                    >
                      <AccordionTrigger className="text-left hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            <div className="text-center mt-8">
              <p className="text-muted-foreground mb-4">
                Still have questions? We are happy to help!
              </p>
              <Button asChild size="lg" className="group">
                <a
                  href="https://wa.me/917458816343?text=Hello%2C%20I%20have%20a%20question%20about%20Nishani%20Woolera%20products."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact via. WhatsApp
                  <WhatsAppIcon className="h-6 w-6 text-white" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ContactUs;
