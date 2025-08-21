import * as React from "react";
import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Phone, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { forwardRef } from "react";
import { validateAndFormatUSAPhone, formatPhoneDisplay, isTestPhoneNumber } from "../lib/phone-validator";

interface PhoneInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ error, value, ...props }, ref) => {
    const [localValue, setLocalValue] = useState(value as string || "");
    const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid' | 'warning'>('idle');
    const [validationMessage, setValidationMessage] = useState<string>("");

    useEffect(() => {
      if (localValue) {
        const validation = validateAndFormatUSAPhone(localValue);
        
        if (validation.isValid) {
          if (isTestPhoneNumber(localValue)) {
            setValidationStatus('warning');
            setValidationMessage('This appears to be a test number');
          } else {
            setValidationStatus('valid');
            setValidationMessage('Valid USA phone number');
          }
        } else if (localValue.replace(/\D/g, '').length < 10) {
          setValidationStatus('idle');
          setValidationMessage('');
        } else {
          setValidationStatus('invalid');
          setValidationMessage(validation.error || 'Invalid phone number');
        }
      } else {
        setValidationStatus('idle');
        setValidationMessage('');
      }
    }, [localValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneDisplay(e.target.value);
      setLocalValue(formatted);
      e.target.value = formatted;
      if (props.onChange) {
        props.onChange(e);
      }
    };

    const getStatusIcon = () => {
      switch (validationStatus) {
        case 'valid':
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'invalid':
          return <XCircle className="h-4 w-4 text-destructive" />;
        case 'warning':
          return <AlertCircle className="h-4 w-4 text-yellow-500" />;
        default:
          return null;
      }
    };

    const getInputClassName = () => {
      let baseClass = "pl-12 pr-10 text-base min-h-[44px]";
      if (error) return `${baseClass} border-destructive`;
      
      switch (validationStatus) {
        case 'valid':
          return `${baseClass} border-green-500 focus:border-green-500`;
        case 'invalid':
          return `${baseClass} border-destructive focus:border-destructive`;
        case 'warning':
          return `${baseClass} border-yellow-500 focus:border-yellow-500`;
        default:
          return baseClass;
      }
    };

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(310) 555-1234"
          onChange={handleChange}
          value={localValue}
          className={getInputClassName()}
        />
        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <div className="absolute right-3 top-3">
          {getStatusIcon()}
        </div>
        {(validationMessage || error) && (
          <p className={`text-sm mt-1 ${
            validationStatus === 'invalid' || error ? 'text-destructive' : 
            validationStatus === 'warning' ? 'text-yellow-600' :
            validationStatus === 'valid' ? 'text-green-600' : ''
          }`}>
            {error || validationMessage}
          </p>
        )}
        {validationStatus === 'idle' && localValue && (
          <p className="text-sm text-muted-foreground mt-1">
            Enter 10-digit USA phone number
          </p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
