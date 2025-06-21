import { Input } from "@/components/ui/input";
import { Phone } from "lucide-react";
import { forwardRef } from "react";

interface PhoneInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ error, ...props }, ref) => {
    const formatPhoneNumber = (value: string) => {
      // Remove all non-digits
      const phoneNumber = value.replace(/\D/g, "");
      
      // Format as (XXX) XXX-XXXX
      if (phoneNumber.length === 0) return "";
      if (phoneNumber.length <= 3) return `(${phoneNumber}`;
      if (phoneNumber.length <= 6) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
      }
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value);
      e.target.value = formatted;
      if (props.onChange) {
        props.onChange(e);
      }
    };

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type="tel"
          placeholder="+1 (555) 123-4567"
          onChange={handleChange}
          className={`pl-12 ${error ? 'border-destructive' : ''}`}
        />
        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        {error && (
          <p className="text-sm text-destructive mt-1">{error}</p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
