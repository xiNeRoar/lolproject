import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAdminLogin, useAdminMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [_, setLocation] = useLocation();
  const { data: user } = useAdminMe({ query: { retry: false }});
  const loginMutation = useAdminLogin();
  const [errorMsg, setErrorMsg] = useState("");

  if (user?.authenticated) {
    setLocation("/admin");
    return null;
  }

  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = (data: LoginValues) => {
    setErrorMsg("");
    loginMutation.mutate({ data }, {
      onSuccess: () => {
        setLocation("/admin");
      },
      onError: (err: any) => {
        setErrorMsg(err.response?.data?.error || "Login failed");
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-primary tracking-widest">VCLoL</h1>
          <p className="text-muted-foreground mt-2 uppercase text-xs tracking-widest">Admin Portal</p>
        </div>
        
        <Card className="border-border/50 shadow-2xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Admin Email</label>
                <Input type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Password</label>
                <Input type="password" {...register("password")} />
              </div>
              
              {errorMsg && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">{errorMsg}</div>}
              
              <Button type="submit" className="w-full mt-6" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
