"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Mail, User } from "lucide-react";

const userDetailsSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
});

export type UserDetailsData = z.infer<typeof userDetailsSchema>;

interface UserDetailsStepProps {
    defaultValues?: UserDetailsData | null;
    onSubmit: (data: UserDetailsData) => void;
}

export default function UserDetailsStep({
    defaultValues,
    onSubmit,
}: UserDetailsStepProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<UserDetailsData>({
        resolver: zodResolver(userDetailsSchema),
        defaultValues: defaultValues || {
            email: "",
            first_name: "",
            last_name: "",
        },
    });

    return (
        <form
            id="user-details-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
        >
            <div>
                <h2 className="text-base font-semibold text-gray-900">
                    User details
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                    An invitation will be sent to this email address.
                </p>
            </div>

            {/* Email */}
            <div>
                <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    Email address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        id="email"
                        type="email"
                        {...register("email")}
                        placeholder="colleague@example.com"
                        className={cn(
                            "w-full border rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all",
                            errors.email
                                ? "border-rose-400 focus:ring-rose-500"
                                : "border-gray-200 focus:ring-indigo-500",
                        )}
                    />
                </div>
                {errors.email && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                        {errors.email.message}
                    </p>
                )}
            </div>

            {/* Name row */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Name{" "}
                    <span className="text-gray-400 font-normal">
                        (optional)
                    </span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            id="first_name"
                            {...register("first_name")}
                            placeholder="First name"
                            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <input
                        id="last_name"
                        {...register("last_name")}
                        placeholder="Last name"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                    Pre-fills their profile when they accept the invitation.
                </p>
            </div>
        </form>
    );
}