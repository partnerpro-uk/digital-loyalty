import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface CreateAccountFormProps {
  onSuccess: () => void;
}

export function CreateAccountForm({ onSuccess }: CreateAccountFormProps) {
  const [formData, setFormData] = useState({
    type: "individual" as "individual" | "franchise",
    name: "",
    planId: "",
    adminUser: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
    location: {
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "US",
      timezone: "America/New_York",
    },
    trialDays: 14,
  });

  const [validation, setValidation] = useState({
    email: { isValid: true, message: "" },
    businessName: { isValid: true, message: "" },
    phone: { isValid: true, message: "" },
  });

  const [isValidating, setIsValidating] = useState({
    email: false,
    businessName: false,
    phone: false,
  });

  const plans = useQuery(api.plans.listPlans);
  const createAccount = useMutation(api.admin.createAccount);

  // Real-time validation queries
  const emailValidation = useQuery(
    api.validation.validateEmail,
    formData.adminUser.email ? { email: formData.adminUser.email } : "skip"
  );

  const businessNameValidation = useQuery(
    api.validation.validateBusinessName,
    formData.name ? { name: formData.name } : "skip"
  );

  const phoneValidation = useQuery(
    api.validation.validatePhone,
    formData.adminUser.phone ? { phone: formData.adminUser.phone } : "skip"
  );

  // Update validation state when queries complete
  useEffect(() => {
    if (emailValidation) {
      setValidation(prev => ({
        ...prev,
        email: {
          isValid: emailValidation.isAvailable,
          message: emailValidation.message
        }
      }));
      setIsValidating(prev => ({ ...prev, email: false }));
    }
  }, [emailValidation]);

  useEffect(() => {
    if (businessNameValidation) {
      setValidation(prev => ({
        ...prev,
        businessName: {
          isValid: businessNameValidation.isAvailable,
          message: businessNameValidation.message
        }
      }));
      setIsValidating(prev => ({ ...prev, businessName: false }));
    }
  }, [businessNameValidation]);

  useEffect(() => {
    if (phoneValidation) {
      setValidation(prev => ({
        ...prev,
        phone: phoneValidation
      }));
      setIsValidating(prev => ({ ...prev, phone: false }));
    }
  }, [phoneValidation]);

  const handleInputChange = (field: string, value: string | number) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Trigger validation for specific fields
    if (field === 'adminUser.email') {
      setIsValidating(prev => ({ ...prev, email: true }));
    } else if (field === 'name') {
      setIsValidating(prev => ({ ...prev, businessName: true }));
    } else if (field === 'adminUser.phone') {
      setIsValidating(prev => ({ ...prev, phone: true }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check all validations
    const isFormValid = validation.email.isValid && 
                       validation.businessName.isValid && 
                       validation.phone.isValid;

    if (!isFormValid) {
      toast.error("Please fix validation errors before submitting");
      return;
    }

    try {
      await createAccount({
        ...formData,
        planId: formData.planId as any, // Type assertion for Convex ID
      });
      toast.success("Account created successfully");
      onSuccess();
      
      // Reset form
      setFormData({
        type: "individual",
        name: "",
        planId: "",
        adminUser: {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
        },
        location: {
          address: "",
          city: "",
          state: "",
          zip: "",
          country: "US",
          timezone: "America/New_York",
        },
        trialDays: 14,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    }
  };

  if (!plans) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredPlans = plans.filter(plan => plan.type === formData.type);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Create New Account</h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Account Type *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="individual"
                  checked={formData.type === "individual"}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="mr-2"
                />
                Individual Account
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="franchise"
                  checked={formData.type === "franchise"}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="mr-2"
                />
                Franchise Account
              </label>
            </div>
          </div>

          {/* Business Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !validation.businessName.isValid ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter business name"
              />
              {isValidating.businessName && (
                <p className="text-sm text-gray-500 mt-1">Checking availability...</p>
              )}
              {!validation.businessName.isValid && (
                <p className="text-sm text-red-600 mt-1">{validation.businessName.message}</p>
              )}
              {validation.businessName.isValid && formData.name && !isValidating.businessName && (
                <p className="text-sm text-green-600 mt-1">✓ Business name is available</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Plan *
              </label>
              <select
                required
                value={formData.planId}
                onChange={(e) => handleInputChange('planId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a plan</option>
                {filteredPlans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name} - ${plan.price}/{plan.billingPeriod}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Admin User Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {formData.type === "franchise" ? "Franchise Admin" : "Account Admin"}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.adminUser.firstName}
                  onChange={(e) => handleInputChange('adminUser.firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.adminUser.lastName}
                  onChange={(e) => handleInputChange('adminUser.lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.adminUser.email}
                  onChange={(e) => handleInputChange('adminUser.email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    !validation.email.isValid ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="admin@company.com"
                />
                {isValidating.email && (
                  <p className="text-sm text-gray-500 mt-1">Checking availability...</p>
                )}
                {!validation.email.isValid && (
                  <p className="text-sm text-red-600 mt-1">{validation.email.message}</p>
                )}
                {validation.email.isValid && formData.adminUser.email && !isValidating.email && (
                  <p className="text-sm text-green-600 mt-1">✓ Email is available</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.adminUser.phone}
                  onChange={(e) => handleInputChange('adminUser.phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    !validation.phone.isValid ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+1234567890"
                />
                {isValidating.phone && (
                  <p className="text-sm text-gray-500 mt-1">Validating format...</p>
                )}
                {!validation.phone.isValid && (
                  <p className="text-sm text-red-600 mt-1">{validation.phone.message}</p>
                )}
                {validation.phone.isValid && formData.adminUser.phone && !isValidating.phone && (
                  <p className="text-sm text-green-600 mt-1">✓ Phone number format is valid</p>
                )}
              </div>
            </div>
          </div>

          {/* Location Information (for Individual accounts) */}
          {formData.type === "individual" && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Location Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location.address}
                    onChange={(e) => handleInputChange('location.address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location.city}
                    onChange={(e) => handleInputChange('location.city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location.state}
                    onChange={(e) => handleInputChange('location.state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location.zip}
                    onChange={(e) => handleInputChange('location.zip', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country *
                  </label>
                  <select
                    required
                    value={formData.location.country}
                    onChange={(e) => handleInputChange('location.country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="UK">United Kingdom</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Trial Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trial Period (Days)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={formData.trialDays}
              onChange={(e) => handleInputChange('trialDays', parseInt(e.target.value))}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Account will start with a {formData.trialDays}-day trial period
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onSuccess}
              className="px-6 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!validation.email.isValid || !validation.businessName.isValid || !validation.phone.isValid}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
