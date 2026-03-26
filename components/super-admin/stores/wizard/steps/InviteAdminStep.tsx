"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ShieldCheck, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

const inviteSchema = z.object({
    email: z.string().email("Enter a valid email address"),
});

export type InviteAdminFormData = z.infer<typeof inviteSchema>;

interface InviteAdminStepProps {
    defaultValues?: InviteAdminFormData | null;
    onSubmit: (data: InviteAdminFormData) => void;
    onSkip: () => void;
}

export default function InviteAdminStep({
    defaultValues,
    onSubmit,
    onSkip,
}: InviteAdminStepProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<InviteAdminFormData>({
        resolver: zodResolver(inviteSchema),
        defaultValues: defaultValues || { email: "" },
    });

    return (
        <div className="space-y-5">
            {/* Info banner */}
            <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <ShieldCheck className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <div className="text-sm text-indigo-800">
                    <p className="font-medium mb-0.5">Store Admin access</p>
                    <p className="text-indigo-600">
                        The invited person will receive a Clerk invitation email
                        and can log in immediately. Their role is locked to{" "}
                        <strong>admin</strong> and their location is
                        automatically set to this new store.
                    </p>
                </div>
            </div>

            {/* Email form */}
            <form
                id="invite-admin-form"
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
            >
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        Admin Email Address{" "}
                        <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            id="email"
                            type="email"
                            {...register("email")}
                            placeholder="manager@lazacafe.com"
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

                <div className="text-xs text-gray-500 space-y-1">
                    <p>
                        • Role: <strong className="text-gray-700">Admin</strong>{" "}
                        (cannot be changed here)
                    </p>
                    <p>• Location: automatically assigned to the new store</p>
                    <p>• They will receive a Clerk invitation email</p>
                </div>
            </form>

            {/* Skip option */}
            <div className="border-t border-gray-100 pt-4">
                <button
                    type="button"
                    onClick={onSkip}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <SkipForward className="w-4 h-4" />
                    Skip for now — invite an admin later from the Users page
                </button>
            </div>
        </div>
    );
}