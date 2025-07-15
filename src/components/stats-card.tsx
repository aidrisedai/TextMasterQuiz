import React from "react";
import { Card, CardContent } from "./ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  iconColor: string;
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  gradient, 
  iconColor 
}: StatsCardProps) {
  return (
    <Card className={`stats-card ${gradient} border-2`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="text-3xl font-bold mb-1">{value}</div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
