import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { PhoneInput } from "./phone-input";
import { useToast } from "../hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Rocket, Loader2, Globe } from "lucide-react";

const signupSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
  preferredTime: z.string().min(1, "Please select a preferred time"),
  timezone: z.string().min(1, "Please select your timezone"),
  categoryPreferences: z
    .array(z.string())
    .min(1, "Please select at least one category"),
  terms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

type SignupFormData = z.infer<typeof signupSchema>;

const categories = [
  { value: "science", label: "Science" },
  { value: "history", label: "History" },
  { value: "sports", label: "Sports" },
  { value: "general", label: "General Knowledge" },
  { value: "geography", label: "Geography" },
  { value: "literature", label: "Literature" },
  { value: "arts", label: "Arts" },
  { value: "technology", label: "Technology" },
  { value: "physics", label: "Physics" },
];

const timeOptions = [
  { value: "06:00", label: "6:00 AM - Early Bird" },
  { value: "09:00", label: "9:00 AM - Morning Commute" },
  { value: "12:00", label: "12:00 PM - Lunch Break" },
  { value: "15:00", label: "3:00 PM - Afternoon" },
  { value: "18:00", label: "6:00 PM - Evening" },
  { value: "21:00", label: "9:00 PM - Night Owl" },
];

const timezoneOptions = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "America/Phoenix", label: "Arizona Time (MST)" },
  { value: "America/Toronto", label: "Eastern Time - Canada" },
  { value: "America/Vancouver", label: "Pacific Time - Canada" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

export function SignupForm() {
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      phoneNumber: "",
      preferredTime: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      categoryPreferences: [],
      terms: false,
    },
  });

  const signupMutation = useMutation({
    mutationFn: (data: SignupFormData) => api.signup(data),
    onSuccess: () => {
      setIsSuccess(true);
      toast({
        title: "Welcome to Text4Quiz!",
        description:
          "You'll receive your first question tomorrow at your preferred time.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Signup Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignupFormData) => {
    // Clean phone number for submission
    const cleanPhone = data.phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      data.phoneNumber = `+1${cleanPhone}`;
    } else if (cleanPhone.length === 11 && cleanPhone[0] === "1") {
      data.phoneNumber = `+${cleanPhone}`;
    }

    signupMutation.mutate(data);
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Rocket className="h-8 w-8 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Text4Quiz!</h2>
            <p className="text-muted-foreground mb-4">
              You're all set! You'll receive your first trivia question tomorrow
              at your preferred time.
            </p>
            <p className="text-sm text-muted-foreground">
              Remember, you can text "HELP" anytime for commands or "STOP" to
              unsubscribe.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl">Join Text4Quiz</CardTitle>
        <CardDescription>Get started in 30 seconds</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <PhoneInput
                      {...field}
                      error={form.formState.errors.phoneNumber?.message}
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    We'll send your daily trivia questions here
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="preferredTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Quiz Time</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your preferred time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Your Timezone
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {timezoneOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Auto-detected:{" "}
                      {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoryPreferences"
              render={() => (
                <FormItem>
                  <FormLabel>Choose Your Categories</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map((category) => (
                      <FormField
                        key={category.value}
                        control={form.control}
                        name="categoryPreferences"
                        render={({ field }) => {
                          return (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(
                                    category.value,
                                  )}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([
                                          ...field.value,
                                          category.value,
                                        ])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== category.value,
                                          ),
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {category.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm">
                      I agree to receive daily SMS messages and accept the{" "}
                      <a href="#" className="text-primary hover:underline">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-primary hover:underline">
                        Privacy Policy
                      </a>
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full btn-primary"
              size="lg"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Start My Daily Quiz
                </>
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Always free. US-based phone numbers only. Premium plan coming soon.
            Cancel anytime by texting "STOP"
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
