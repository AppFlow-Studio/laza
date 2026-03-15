"use client";

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useCreateInvitation } from '@/lib/hooks/queries/useUsers';
import UserWizardSidebar from './UserWizardSidebar';
import RoleStep, { type RoleStepData } from './steps/RoleStep';
import LocationStep, { type LocationStepData } from './steps/LocationStep';
import UserDetailsStep, { type UserDetailsData } from './steps/UserDetailsStep';
import UserReviewStep from './steps/UserReviewStep';

const TOTAL_STEPS = 4;

interface InviteUserWizardProps {
	organizationId: string;
	onSuccess: () => void;
	onClose: () => void;
}

export default function InviteUserWizard({ organizationId, onSuccess, onClose }: InviteUserWizardProps) {
	const createInvitationMutation = useCreateInvitation();

	const [currentStep, setCurrentStep] = useState(1);
	const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
	const [direction, setDirection] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Step data
	const [roleData, setRoleData] = useState<RoleStepData | null>(null);
	const [locationData, setLocationData] = useState<LocationStepData | null>(null);
	const [userDetails, setUserDetails] = useState<UserDetailsData | null>(null);

	const markCompleted = useCallback((step: number) => {
		setCompletedSteps(prev => new Set([...prev, step]));
	}, []);

	const goToStep = useCallback((step: number) => {
		setDirection(step > currentStep ? 1 : -1);
		setCurrentStep(step);
	}, [currentStep]);

	// Step 1: Role selection
	const handleRoleSubmit = (data: RoleStepData) => {
		setRoleData(data);
		markCompleted(1);
		goToStep(2);
	};

	// Step 2: Location (skip for super_admin)
	const handleLocationSubmit = (data: LocationStepData) => {
		setLocationData(data);
		markCompleted(2);
		goToStep(3);
	};

	const handleLocationSkip = () => {
		setLocationData({ assigned_location_id: null, assigned_location_ids: [] });
		markCompleted(2);
		goToStep(3);
	};

	// Step 3: User details
	const handleDetailsSubmit = (data: UserDetailsData) => {
		setUserDetails(data);
		markCompleted(3);
		goToStep(4);
	};

	// Navigation
	const handleNext = () => {
		if (currentStep === 1) {
			document.getElementById('role-step-form')?.dispatchEvent(
				new Event('submit', { cancelable: true, bubbles: true })
			);
			return;
		}
		if (currentStep === 2) {
			if (roleData?.role === 'super_admin') {
				handleLocationSkip();
				return;
			}
			document.getElementById('location-step-form')?.dispatchEvent(
				new Event('submit', { cancelable: true, bubbles: true })
			);
			return;
		}
		if (currentStep === 3) {
			document.getElementById('user-details-form')?.dispatchEvent(
				new Event('submit', { cancelable: true, bubbles: true })
			);
			return;
		}
	};

	const handleBack = () => {
		if (currentStep > 1) goToStep(currentStep - 1);
	};

	const handleSubmit = async () => {
		if (!roleData || !userDetails) return;
		setIsSubmitting(true);
		try {
			const primaryLocationId =
				roleData.role === 'employee'
					? locationData?.assigned_location_id ?? null
					: roleData.role === 'admin'
						? (locationData?.assigned_location_ids?.[0] ?? null)
						: null;

			const result = await createInvitationMutation.mutateAsync({
				organizationId,
				email: userDetails.email,
				role: roleData.role,
				assigned_location_id: primaryLocationId,
				assigned_location_ids: roleData.role === 'admin'
					? locationData?.assigned_location_ids
					: undefined,
				first_name: userDetails.first_name || undefined,
				last_name: userDetails.last_name || undefined,
			});

			if (result.success) {
				toast.success(result.message);
				onSuccess();
				onClose();
			} else {
				toast.error(result.message);
			}
		} catch (error: any) {
			toast.error(error.message || 'Failed to send invitation');
		} finally {
			setIsSubmitting(false);
		}
	};

	// Derive step labels based on role
	const stepLabels = {
		2: roleData?.role === 'super_admin'
			? 'Access (No location needed)'
			: roleData?.role === 'admin'
				? 'Locations'
				: 'Location',
	};

	const isNextDisabled = () => {
		if (currentStep === 1 && !roleData) return false; // form handles validation
		return isSubmitting;
	};

	const stepContent = () => {
		switch (currentStep) {
			case 1:
				return (
					<RoleStep
						defaultValues={roleData}
						onSubmit={handleRoleSubmit}
					/>
				);
			case 2:
				return (
					<LocationStep
						role={roleData?.role ?? 'employee'}
						defaultValues={locationData}
						onSubmit={handleLocationSubmit}
					/>
				);
			case 3:
				return (
					<UserDetailsStep
						defaultValues={userDetails}
						onSubmit={handleDetailsSubmit}
					/>
				);
			case 4:
				return roleData && userDetails ? (
					<UserReviewStep
						roleData={roleData}
						locationData={locationData}
						userDetails={userDetails}
						onEditStep={goToStep}
					/>
				) : null;
			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col h-full max-h-[85vh] ">
			{/* Header */}
			<div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100 flex-shrink-0">
				<div>
					<h1 className="text-lg font-semibold text-zinc-900">Invite Team Member</h1>
					<p className="text-sm text-zinc-500 mt-0.5">Step {currentStep} of {TOTAL_STEPS}</p>
				</div>
			</div>

			{/* Progress bar */}
			<div className="px-6 pt-4 flex-shrink-0">
				<div className="w-full bg-zinc-100 rounded-full h-1.5">
					<div
						className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
						style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
					/>
				</div>
			</div>

			{/* Body */}
			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar */}
				<div className="hidden sm:block w-52 flex-shrink-0 px-4 py-6 border-r border-zinc-100">
					<UserWizardSidebar
						currentStep={currentStep}
						completedSteps={completedSteps}
						role={roleData?.role}
						onStepClick={(step) => {
							if (completedSteps.has(step) || step === currentStep) goToStep(step);
						}}
					/>
				</div>

				{/* Step content */}
				<div className="flex-1 overflow-y-auto px-6 py-6">
					<AnimatePresence mode="wait" initial={false}>
						<motion.div
							key={currentStep}
							initial={{ opacity: 0, x: direction * 24 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: direction * -24 }}
							transition={{ duration: 0.18 }}
						>
							{stepContent()}
						</motion.div>
					</AnimatePresence>
				</div>
			</div>

			{/* Footer */}
			<div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 flex-shrink-0 bg-zinc-50/50">
				<Button
					variant="outline"
					onClick={handleBack}
					disabled={currentStep === 1 || isSubmitting}
					size="sm"
				>
					<ArrowLeft className="w-4 h-4 mr-1.5" />
					Back
				</Button>

				{currentStep < TOTAL_STEPS ? (
					<Button onClick={handleNext} disabled={isNextDisabled()} size="sm">
						Next
						<ArrowRight className="w-4 h-4 ml-1.5" />
					</Button>
				) : (
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting || !roleData || !userDetails}
						size="sm"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
								Sending...
							</>
						) : (
							'Send Invitation'
						)}
					</Button>
				)}
			</div>
		</div>
	);
}