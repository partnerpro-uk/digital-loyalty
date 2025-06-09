import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "most_loyal" | "recently_visited" | "card_installed" | "alphabetical_az" | "alphabetical_za">("newest");
  const [filterStatus, setFilterStatus] = useState<"active" | "inactive" | "blocked" | "all">("all");
  const [filterDevice, setFilterDevice] = useState<string>("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterCardStatus, setFilterCardStatus] = useState<"installed" | "pending" | "none" | "all">("all");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  // Advanced filtering state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateFilters, setDateFilters] = useState({
    joinedAfter: "",
    joinedBefore: "",
    lastVisitAfter: "",
    lastVisitBefore: ""
  });
  const [amountFilters, setAmountFilters] = useState({
    minLifetimeSpend: "",
    maxLifetimeSpend: "",
    minVisits: "",
    maxVisits: "",
    minPoints: "",
    maxPoints: ""
  });
  const [utmFilters, setUtmFilters] = useState({
    utmSource: "",
    utmMedium: "",
    utmCampaign: ""
  });

  // Saved filter views
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Queries
  const metrics = useQuery(api.customers.getCustomerMetrics);
  const customers = useQuery(api.customers.listCustomers, {
    search: searchTerm || undefined,
    sortBy,
    filterStatus: filterStatus === "all" ? undefined : filterStatus,
    filterDevice: filterDevice || undefined,
    filterTags: filterTags.length > 0 ? filterTags : undefined,
    filterCardStatus: filterCardStatus === "all" ? undefined : filterCardStatus,
    limit: 50,
  });
  const availableTags = useQuery(api.customers.getCustomerTags);

  // Mutations
  const createCustomer = useMutation(api.customers.createCustomer);
  const deleteCustomer = useMutation(api.customers.deleteCustomer);
  const migrateSchema = useMutation(api.customers.migrateCustomersSchema);
  const setupUserAccount = useMutation(api.customers.setupUserAccount);
  const bulkUpdateCustomers = useMutation(api.customers.bulkUpdateCustomers);
  const exportCustomers = useQuery(api.customers.exportCustomers, 
    selectedCustomers.length > 0 ? { customerIds: selectedCustomers as any } : "skip"
  );
  const scheduleBulkMessage = useMutation(api.customers.scheduleBulkMessage);

  const handleCreateCustomer = async (customerData: any) => {
    try {
      const result = await createCustomer(customerData);
      toast.success(result.message);
      setShowCreateModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create customer");
    }
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!confirm(`Are you sure you want to delete ${customerName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteCustomer({ customerId: customerId as any });
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete customer");
    }
  };

  const handleViewProfile = (customer: any) => {
    setSelectedCustomer(customer);
    setShowProfileModal(true);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCustomers.length === 0) {
      toast.error("Please select customers first");
      return;
    }
    
    try {
      switch (action) {
        case "message":
          // For now, show a simple prompt
          const messageText = prompt("Enter message to send to selected customers:");
          if (messageText) {
            const result = await scheduleBulkMessage({
              customerIds: selectedCustomers as any,
              messageType: "email",
              message: messageText
            });
            toast.success(result.message);
            setSelectedCustomers([]);
          }
          break;
          
        case "tag":
          const tagToAdd = prompt("Enter tag to add to selected customers:");
          if (tagToAdd) {
            const result = await bulkUpdateCustomers({
              customerIds: selectedCustomers as any,
              operation: "add_tag",
              data: { tag: tagToAdd }
            });
            toast.success(result.message);
            setSelectedCustomers([]);
          }
          break;
          
        case "export":
          // Trigger export download
          if (exportCustomers) {
            const csvContent = convertToCSV(exportCustomers.data);
            downloadCSV(csvContent, `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
            toast.success(`Exported ${exportCustomers.count} customers`);
          }
          break;
          
        case "delete":
          if (confirm(`Are you sure you want to delete ${selectedCustomers.length} customers? This action cannot be undone.`)) {
            const result = await bulkUpdateCustomers({
              customerIds: selectedCustomers as any,
              operation: "delete",
              data: {}
            });
            toast.success(result.message);
            setSelectedCustomers([]);
          }
          break;
      }
    } catch (error: any) {
      toast.error(error.message || "Bulk operation failed");
    }
  };

  // Helper functions for CSV export
  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return "";
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(",")
      )
    ];
    
    return csvRows.join("\n");
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const toggleAllCustomers = () => {
    if (customers?.customers) {
      setSelectedCustomers(
        selectedCustomers.length === customers.customers.length 
          ? []
          : customers.customers.map(c => c._id)
      );
    }
  };

  // Advanced filtering functions (move these before the loading checks)
  const applyAdvancedFilters = (customers: any[]) => {
    return customers.filter(customer => {
      // Date filters
      if (dateFilters.joinedAfter && customer._creationTime < new Date(dateFilters.joinedAfter).getTime()) {
        return false;
      }
      if (dateFilters.joinedBefore && customer._creationTime > new Date(dateFilters.joinedBefore).getTime()) {
        return false;
      }
      if (dateFilters.lastVisitAfter && (!customer.lastVisited || customer.lastVisited < new Date(dateFilters.lastVisitAfter).getTime())) {
        return false;
      }
      if (dateFilters.lastVisitBefore && (!customer.lastVisited || customer.lastVisited > new Date(dateFilters.lastVisitBefore).getTime())) {
        return false;
      }

      // Amount filters
      if (amountFilters.minLifetimeSpend && customer.lifetimeSpend < parseFloat(amountFilters.minLifetimeSpend)) {
        return false;
      }
      if (amountFilters.maxLifetimeSpend && customer.lifetimeSpend > parseFloat(amountFilters.maxLifetimeSpend)) {
        return false;
      }
      if (amountFilters.minVisits && customer.totalVisits < parseInt(amountFilters.minVisits)) {
        return false;
      }
      if (amountFilters.maxVisits && customer.totalVisits > parseInt(amountFilters.maxVisits)) {
        return false;
      }
      if (amountFilters.minPoints && customer.pointsBalance < parseInt(amountFilters.minPoints)) {
        return false;
      }
      if (amountFilters.maxPoints && customer.pointsBalance > parseInt(amountFilters.maxPoints)) {
        return false;
      }

      // UTM filters
      if (utmFilters.utmSource && customer.utmSource !== utmFilters.utmSource) {
        return false;
      }
      if (utmFilters.utmMedium && customer.utmMedium !== utmFilters.utmMedium) {
        return false;
      }
      if (utmFilters.utmCampaign && customer.utmCampaign !== utmFilters.utmCampaign) {
        return false;
      }

      return true;
    });
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterDevice("");
    setFilterTags([]);
    setFilterCardStatus("all");
    setDateFilters({
      joinedAfter: "",
      joinedBefore: "",
      lastVisitAfter: "",
      lastVisitBefore: ""
    });
    setAmountFilters({
      minLifetimeSpend: "",
      maxLifetimeSpend: "",
      minVisits: "",
      maxVisits: "",
      minPoints: "",
      maxPoints: ""
    });
    setUtmFilters({
      utmSource: "",
      utmMedium: "",
      utmCampaign: ""
    });
    setActiveViewId(null);
  };

  const getCurrentFilterState = () => ({
    searchTerm,
    sortBy,
    filterStatus,
    filterDevice,
    filterTags,
    filterCardStatus,
    dateFilters,
    amountFilters,
    utmFilters
  });

  const applyFilterState = (filterState: any) => {
    setSearchTerm(filterState.searchTerm || "");
    setSortBy(filterState.sortBy || "newest");
    setFilterStatus(filterState.filterStatus || "all");
    setFilterDevice(filterState.filterDevice || "");
    setFilterTags(filterState.filterTags || []);
    setFilterCardStatus(filterState.filterCardStatus || "all");
    setDateFilters(filterState.dateFilters || {
      joinedAfter: "",
      joinedBefore: "",
      lastVisitAfter: "",
      lastVisitBefore: ""
    });
    setAmountFilters(filterState.amountFilters || {
      minLifetimeSpend: "",
      maxLifetimeSpend: "",
      minVisits: "",
      maxVisits: "",
      minPoints: "",
      maxPoints: ""
    });
    setUtmFilters(filterState.utmFilters || {
      utmSource: "",
      utmMedium: "",
      utmCampaign: ""
    });
  };

  const saveCurrentView = (name: string) => {
    const newView = {
      id: Date.now().toString(),
      name,
      filters: getCurrentFilterState(),
      createdAt: new Date().toISOString()
    };
    
    const updatedViews = [...savedViews, newView];
    setSavedViews(updatedViews);
    localStorage.setItem('customerFilterViews', JSON.stringify(updatedViews));
    setActiveViewId(newView.id);
    toast.success(`Filter view "${name}" saved`);
  };

  const loadView = (viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (view) {
      applyFilterState(view.filters);
      setActiveViewId(viewId);
      toast.success(`Loaded filter view "${view.name}"`);
    }
  };

  const deleteView = (viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (view && confirm(`Are you sure you want to delete the view "${view.name}"?`)) {
      const updatedViews = savedViews.filter(v => v.id !== viewId);
      setSavedViews(updatedViews);
      localStorage.setItem('customerFilterViews', JSON.stringify(updatedViews));
      if (activeViewId === viewId) {
        setActiveViewId(null);
      }
      toast.success(`Filter view "${view.name}" deleted`);
    }
  };

  // Load saved views on component mount
  useEffect(() => {
    const saved = localStorage.getItem('customerFilterViews');
    if (saved) {
      try {
        setSavedViews(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved filter views:', error);
      }
    }
  }, []);

  // Filter customers based on all criteria
  const filteredCustomers = customers ? customers.customers.filter((customer: any) => {
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        customer.fullName?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.phone?.toLowerCase().includes(searchLower) ||
        customer.tags?.some((tag: any) => tag.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filterStatus !== "all" && customer.status !== filterStatus) {
      return false;
    }

    // Device filter
    if (filterDevice && customer.preferredDevice !== filterDevice) {
      return false;
    }

    // Tags filter
    if (filterTags.length > 0) {
      const hasAllTags = filterTags.every(tag => 
        customer.tags?.includes(tag)
      );
      if (!hasAllTags) return false;
    }

    // Card status filter
    if (filterCardStatus !== "all") {
      const hasLoyaltyCard = customer.loyaltyCards?.length > 0;
      if (filterCardStatus === "installed" && !hasLoyaltyCard) return false;
      if (filterCardStatus === "none" && hasLoyaltyCard) return false;
      if (filterCardStatus === "pending") {
        // This would need additional logic based on your card installation flow
      }
    }

    return true;
  }).filter((customer: any) => applyAdvancedFilters([customer]).length > 0) : [];

  // Check for authentication error - simplified check
  if (metrics === undefined && customers === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Check for auth error (if both queries return null rather than undefined)
  if (metrics === null || customers === null) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600">Manage your loyalty program members</p>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">Account Setup Required</h3>
              <p className="text-yellow-700 mt-1">
                Your user account needs to be associated with a business account to access customer data.
              </p>
              <button
                onClick={async () => {
                  try {
                    const result = await setupUserAccount({});
                    toast.success(result.message);
                    // Refresh the page to load data
                    window.location.reload();
                  } catch (error: any) {
                    toast.error(error.message || "Setup failed");
                  }
                }}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors mt-3 flex items-center space-x-2"
              >
                <span>🔧</span>
                <span>Setup Account Now</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your loyalty program members</p>
        </div>
      </div>

      {/* Show loading state or main content */}
      {!metrics || !customers ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading customer data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Total Customers"
              value={metrics.totalCustomers.toLocaleString()}
              growth={metrics.customerGrowth}
              icon="👥"
            />
            <MetricCard
              title="Cards Installed"
              value={metrics.cardsInstalled.toLocaleString()}
              growth={metrics.cardGrowth}
              icon="📱"
            />
            <MetricCard
              title="Card Transactions"
              value={metrics.cardTransactions.toLocaleString()}
              growth={metrics.transactionGrowth}
              icon="💳"
            />
          </div>

          {/* Table Controls */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
                >
                  <span>➕</span>
                  <span>Add Customer</span>
                </button>
                <button
                  onClick={() => toast.info("Import feature coming soon")}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                >
                  <span>⬇</span>
                  <span>Import</span>
                </button>
                <button
                  onClick={() => toast.info("Export feature coming soon")}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                >
                  <span>⬆</span>
                  <span>Export</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      const result = await migrateSchema({});
                      toast.success(result.message);
                    } catch (error: any) {
                      toast.error(error.message || "Migration failed");
                    }
                  }}
                  className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors flex items-center space-x-2"
                >
                  <span>🔄</span>
                  <span>Migrate Schema</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      const result = await setupUserAccount({});
                      toast.success(result.message);
                    } catch (error: any) {
                      toast.error(error.message || "Setup failed");
                    }
                  }}
                  className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-2"
                >
                  <span>🔧</span>
                  <span>Setup Account</span>
                </button>
              </div>

              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search customers by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-600">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="most_loyal">Most Loyal</option>
                  <option value="recently_visited">Recently Visited</option>
                  <option value="card_installed">Card Installed</option>
                  <option value="alphabetical_az">A-Z</option>
                  <option value="alphabetical_za">Z-A</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-600">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Customers</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-600">Card Status:</label>
                <select
                  value={filterCardStatus}
                  onChange={(e) => setFilterCardStatus(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Cards</option>
                  <option value="installed">Installed</option>
                  <option value="pending">Pending</option>
                  <option value="none">No Card</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-600">Device:</label>
                <select
                  value={filterDevice}
                  onChange={(e) => setFilterDevice(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Devices</option>
                  <option value="ios">iOS</option>
                  <option value="android">Android</option>
                  <option value="web">Web</option>
                </select>
              </div>
            </div>

            {/* Advanced Filters Toggle & Saved Views */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    showAdvancedFilters
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Advanced Filters
                  <svg 
                    className={`w-4 h-4 ml-2 inline transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Clear All
                </button>
              </div>
              
              {/* Saved Views */}
              <div className="flex items-center space-x-2">
                {savedViews.length > 0 && (
                  <select
                    value={activeViewId || ""}
                    onChange={(e) => e.target.value ? loadView(e.target.value) : clearAllFilters()}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  >
                    <option value="">Select saved view...</option>
                    {savedViews.map(view => (
                      <option key={view.id} value={view.id}>{view.name}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setShowSaveViewModal(true)}
                  className="px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Save View
                </button>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                {/* Date Filters */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Date Filters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Joined After</label>
                      <input
                        type="date"
                        value={dateFilters.joinedAfter}
                        onChange={(e) => setDateFilters(prev => ({ ...prev, joinedAfter: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Joined Before</label>
                      <input
                        type="date"
                        value={dateFilters.joinedBefore}
                        onChange={(e) => setDateFilters(prev => ({ ...prev, joinedBefore: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Last Visit After</label>
                      <input
                        type="date"
                        value={dateFilters.lastVisitAfter}
                        onChange={(e) => setDateFilters(prev => ({ ...prev, lastVisitAfter: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Last Visit Before</label>
                      <input
                        type="date"
                        value={dateFilters.lastVisitBefore}
                        onChange={(e) => setDateFilters(prev => ({ ...prev, lastVisitBefore: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Amount/Number Filters */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Amount & Number Filters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Min Lifetime Spend</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="£0.00"
                        value={amountFilters.minLifetimeSpend}
                        onChange={(e) => setAmountFilters(prev => ({ ...prev, minLifetimeSpend: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Lifetime Spend</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="£1000.00"
                        value={amountFilters.maxLifetimeSpend}
                        onChange={(e) => setAmountFilters(prev => ({ ...prev, maxLifetimeSpend: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Min Visits</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={amountFilters.minVisits}
                        onChange={(e) => setAmountFilters(prev => ({ ...prev, minVisits: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Visits</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="100"
                        value={amountFilters.maxVisits}
                        onChange={(e) => setAmountFilters(prev => ({ ...prev, maxVisits: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Min Points</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={amountFilters.minPoints}
                        onChange={(e) => setAmountFilters(prev => ({ ...prev, minPoints: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Points</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="1000"
                        value={amountFilters.maxPoints}
                        onChange={(e) => setAmountFilters(prev => ({ ...prev, maxPoints: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* UTM Filters */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">UTM Attribution Filters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">UTM Source</label>
                      <input
                        type="text"
                        placeholder="e.g., google, facebook"
                        value={utmFilters.utmSource}
                        onChange={(e) => setUtmFilters(prev => ({ ...prev, utmSource: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">UTM Medium</label>
                      <input
                        type="text"
                        placeholder="e.g., cpc, email"
                        value={utmFilters.utmMedium}
                        onChange={(e) => setUtmFilters(prev => ({ ...prev, utmMedium: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">UTM Campaign</label>
                      <input
                        type="text"
                        placeholder="e.g., summer_sale"
                        value={utmFilters.utmCampaign}
                        onChange={(e) => setUtmFilters(prev => ({ ...prev, utmCampaign: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Filters Summary */}
            {(searchTerm || filterStatus !== "all" || filterDevice || filterTags.length > 0 || 
              filterCardStatus !== "all" || Object.values(dateFilters).some(v => v) || 
              Object.values(amountFilters).some(v => v) || Object.values(utmFilters).some(v => v)) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-blue-900">Active Filters</h4>
                  {activeViewId && (
                    <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                      View: {savedViews.find(v => v.id === activeViewId)?.name}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      Search: "{searchTerm}"
                      <button onClick={() => setSearchTerm("")} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                    </span>
                  )}
                  {filterStatus !== "all" && (
                    <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      Status: {filterStatus}
                      <button onClick={() => setFilterStatus("all")} className="ml-1 text-blue-600 hover:text-blue-800">×</button>
                    </span>
                  )}
                  {/* Add more filter tags as needed */}
                </div>
              </div>
            )}

            {/* Bulk Actions */}
            {selectedCustomers.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleBulkAction("message")}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Send Message
                    </button>
                    <button
                      onClick={() => handleBulkAction("tag")}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      Add Tags
                    </button>
                    <button
                      onClick={() => handleBulkAction("export")}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                    >
                      Export
                    </button>
                    <button
                      onClick={() => handleBulkAction("delete")}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Table */}
            <CustomerTable
              customers={filteredCustomers}
              selectedCustomers={selectedCustomers}
              onToggleCustomer={toggleCustomerSelection}
              onToggleAll={toggleAllCustomers}
              onViewProfile={handleViewProfile}
              onDeleteCustomer={handleDeleteCustomer}
            />

            {/* Pagination Info */}
            <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
              <div>
                Showing {filteredCustomers.length} of {customers.total} customers
              </div>
              {customers.hasMore && (
                <button className="text-blue-600 hover:text-blue-800">
                  Load more...
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create Customer Modal */}
      {showCreateModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateCustomer}
          availableTags={availableTags || []}
        />
      )}

      {/* Customer Profile Modal */}
      {showProfileModal && selectedCustomer && (
        <CustomerProfileModal
          customer={selectedCustomer}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedCustomer(null);
          }}
        />
      )}

      {/* Save View Modal */}
      {showSaveViewModal && (
        <SaveViewModal
          onClose={() => setShowSaveViewModal(false)}
          onSave={saveCurrentView}
        />
      )}
    </div>
  );
}

function MetricCard({ title, value, growth, icon }: {
  title: string;
  value: string;
  growth: number;
  icon: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl">{icon}</div>
        <div className={`flex items-center text-sm ${
          growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-600'
        }`}>
          {growth > 0 ? '↑' : growth < 0 ? '↓' : '→'} {Math.abs(growth)}% this month
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );
}

function CustomerTable({ customers, selectedCustomers, onToggleCustomer, onToggleAll, onViewProfile, onDeleteCustomer }: {
  customers: any[];
  selectedCustomers: string[];
  onToggleCustomer: (id: string) => void;
  onToggleAll: () => void;
  onViewProfile: (customer: any) => void;
  onDeleteCustomer: (id: string, name: string) => void;
}) {
  const getCardStatusDisplay = (customer: any) => {
    switch (customer.cardStatus) {
      case "installed":
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">✓ Installed</span>;
      case "pending":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">⏳ Pending</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">No Card</span>;
    }
  };

  const getDeviceDisplay = (customer: any) => {
    if (!customer.primaryDevice) return "-";
    return `${customer.primaryDevice.type} ${customer.primaryDevice.model || ''}`.trim();
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedCustomers.length === customers.length && customers.length > 0}
                onChange={onToggleAll}
                className="rounded border-gray-300"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Card Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Visited</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loyalty Score</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {customers.map((customer) => (
            <tr 
              key={customer._id} 
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onViewProfile(customer)}
            >
              <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedCustomers.includes(customer._id)}
                  onChange={() => onToggleCustomer(customer._id)}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{customer.fullName}</div>
                  <div className="text-sm text-gray-500">{customer.email}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {new Date(customer._creationTime).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>{customer.email}</div>
                {customer.phone && <div>{customer.phone}</div>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {getDeviceDisplay(customer)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getCardStatusDisplay(customer)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {customer.daysSinceLastVisit ? `${customer.daysSinceLastVisit} days ago` : "Never"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {customer.loyaltyScore}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-wrap gap-1">
                  {customer.tags.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                  {customer.tags.length > 2 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{customer.tags.length - 2}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onViewProfile(customer)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View
                  </button>
                  <button
                    onClick={() => toast.info("Edit feature coming soon")}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteCustomer(customer._id, customer.fullName)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {customers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No customers found</div>
          <div className="text-sm text-gray-400">Try adjusting your search or filters</div>
        </div>
      )}
    </div>
  );
}

function CreateCustomerModal({ onClose, onSubmit, availableTags }: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  availableTags: string[];
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthday: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    tags: [] as string[],
    generateCard: false,
    cardType: "stamp" as "stamp" | "points" | "membership",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      birthday: formData.birthday ? new Date(formData.birthday).getTime() : undefined,
      utmSource: formData.utmSource || undefined,
      utmMedium: formData.utmMedium || undefined,
      utmCampaign: formData.utmCampaign || undefined,
    };

    onSubmit(submitData);
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Add New Customer</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
                <input
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Attribution */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attribution (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UTM Source</label>
                <input
                  type="text"
                  value={formData.utmSource}
                  onChange={(e) => setFormData(prev => ({ ...prev, utmSource: e.target.value }))}
                  placeholder="google, facebook, newsletter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UTM Medium</label>
                <input
                  type="text"
                  value={formData.utmMedium}
                  onChange={(e) => setFormData(prev => ({ ...prev, utmMedium: e.target.value }))}
                  placeholder="cpc, social, email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UTM Campaign</label>
                <input
                  type="text"
                  value={formData.utmCampaign}
                  onChange={(e) => setFormData(prev => ({ ...prev, utmCampaign: e.target.value }))}
                  placeholder="spring_sale, launch_2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tags</h3>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center space-x-2"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {availableTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available Tags:</label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.filter(tag => !formData.tags.includes(tag)).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Loyalty Card */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Loyalty Card</h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.generateCard}
                  onChange={(e) => setFormData(prev => ({ ...prev, generateCard: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Generate loyalty card</span>
              </label>
              
              {formData.generateCard && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Card Type</label>
                  <select
                    value={formData.cardType}
                    onChange={(e) => setFormData(prev => ({ ...prev, cardType: e.target.value as any }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="stamp">Stamp Card</option>
                    <option value="points">Points Card</option>
                    <option value="membership">Membership Card</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Create Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerProfileModal({ customer, onClose }: {
  customer: any;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  
  // Enhanced queries for profile data
  const enhancedProfile = useQuery(api.customers.getCustomerProfileEnhanced, { 
    customerId: customer._id 
  });
  const customerActivity = useQuery(api.customers.getCustomerActivity, { 
    customerId: customer._id,
    limit: 10 
  });
  const customerTransactions = useQuery(api.customers.getCustomerTransactions, { 
    customerId: customer._id,
    limit: 20 
  });

  const adjustBalance = useMutation(api.customers.adjustCustomerBalance);

  const handleAdjustment = async (adjustmentData: any) => {
    try {
      const result = await adjustBalance({
        customerId: customer._id,
        ...adjustmentData
      });
      toast.success(result.message);
      setShowAdjustmentModal(false);
    } catch (error: any) {
      toast.error(error.message || "Adjustment failed");
    }
  };

  if (!enhancedProfile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Profile Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Customers</span>
            </button>
            <div className="flex space-x-2">
              <button className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                Edit
              </button>
              <button 
                onClick={() => setShowAdjustmentModal(true)}
                className="px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100"
              >
                Adjust Balance
              </button>
              <button className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                Delete
              </button>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
              👤
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{enhancedProfile.fullName}</h1>
              <p className="text-gray-600">{enhancedProfile.email} | {enhancedProfile.phone}</p>
              <p className="text-sm text-gray-500 mt-1">
                Member since: {new Date(enhancedProfile._creationTime).toLocaleDateString()} | 
                {enhancedProfile.birthday && ` Birthday: ${new Date(enhancedProfile.birthday).toLocaleDateString()}`}
              </p>
              {enhancedProfile.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {enhancedProfile.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: "overview", label: "Overview" },
              { id: "activity", label: "Activity" },
              { id: "transactions", label: "Transactions" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Loyalty Overview Metrics */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Loyalty Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-900">{enhancedProfile.pointsBalance}</div>
                    <div className="text-sm text-blue-600">Points/Stamps</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-900">{enhancedProfile.rewardsEarned}</div>
                    <div className="text-sm text-green-600">Rewards Earned</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-900">{enhancedProfile.rewardsAvailable}</div>
                    <div className="text-sm text-purple-600">Rewards Available</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-900">{enhancedProfile.totalVisits}</div>
                    <div className="text-sm text-orange-600">Total Visits</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-900">{enhancedProfile.stampsBalance}</div>
                    <div className="text-sm text-red-600">Actual Stamps</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-900">{enhancedProfile.referralCount}</div>
                    <div className="text-sm text-yellow-600">Referrals Made</div>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-indigo-900">£{enhancedProfile.lifetimeSpend.toFixed(2)}</div>
                    <div className="text-sm text-indigo-600">Lifetime Spend</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {enhancedProfile.daysSinceLastVisit !== null ? `${enhancedProfile.daysSinceLastVisit}d` : "Never"}
                    </div>
                    <div className="text-sm text-gray-600">Last Visited</div>
                  </div>
                </div>
              </div>

              {/* Card Information */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Digital Loyalty Cards</h2>
                {enhancedProfile.loyaltyCards.length > 0 ? (
                  <div className="space-y-4">
                    {enhancedProfile.loyaltyCards.map((card: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-medium text-gray-900 capitalize">{card.cardType} Card</h3>
                            <p className="text-sm text-gray-600">Serial Number: {card.serialNumber}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            card.installStatus === "installed" 
                              ? "bg-green-100 text-green-800"
                              : card.installStatus === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {card.installStatus === "installed" ? "✓ Installed" : 
                             card.installStatus === "pending" ? "⏳ Pending" : "Not Installed"}
                          </span>
                        </div>
                        
                        {card.device && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-600">
                              Device: {card.device.type} {card.device.model} ({card.device.os})
                            </p>
                            {card.installedAt && (
                              <p className="text-sm text-gray-600">
                                Installed: {new Date(card.installedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Install Link:</span>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              app.loyalty.com/install/{card.serialNumber.slice(-8)}
                            </code>
                            <button className="text-blue-600 text-sm hover:text-blue-800">Copy</button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Referral Link:</span>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              app.loyalty.com/ref/{card.serialNumber.slice(-8)}
                            </code>
                            <button className="text-blue-600 text-sm hover:text-blue-800">Copy</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No loyalty cards generated for this customer</p>
                    <button className="mt-2 text-blue-600 hover:text-blue-800">Generate Card</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <button className="text-blue-600 hover:text-blue-800">View All →</button>
              </div>
              
              {customerActivity && customerActivity.length > 0 ? (
                <div className="space-y-4">
                  {customerActivity.map((activity: any) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl">{activity.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">{activity.title}</h3>
                          <span className="text-sm text-gray-500">{activity.timeAgo}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No recent activity found</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "transactions" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Export CSV
                </button>
              </div>
              
              {customerTransactions && customerTransactions.transactions.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date/Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points/Stamps
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customerTransactions.transactions.map((transaction: any) => (
                        <tr key={transaction._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div>{transaction.dateFormatted}</div>
                            <div className="text-gray-500">{transaction.timeFormatted}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              transaction.type === "purchase" ? "bg-green-100 text-green-800" :
                              transaction.type === "redemption" ? "bg-red-100 text-red-800" :
                              transaction.type === "referral" ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {transaction.typeDisplay}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.amountFormatted}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.pointsStampsDisplay}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No transactions found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <AdjustmentModal
          customer={enhancedProfile}
          onClose={() => setShowAdjustmentModal(false)}
          onSubmit={handleAdjustment}
        />
      )}
    </div>
  );
}

function AdjustmentModal({ customer, onClose, onSubmit }: {
  customer: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [adjustmentData, setAdjustmentData] = useState({
    adjustmentType: "points" as "points" | "stamps",
    amount: "",
    reason: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adjustmentData.amount || !adjustmentData.reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(adjustmentData.amount);
    if (isNaN(amount)) {
      toast.error("Please enter a valid number for amount");
      return;
    }

    const submitData = {
      adjustmentType: adjustmentData.adjustmentType,
      amount: amount,
      reason: adjustmentData.reason,
      notes: adjustmentData.notes || undefined
    };

    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Adjust Customer Balance</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Adjusting balance for: <strong>{customer.fullName}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Balances */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Current Balances</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Points:</span>
                <span className="ml-2 font-medium">{customer.pointsBalance}</span>
              </div>
              <div>
                <span className="text-gray-600">Stamps:</span>
                <span className="ml-2 font-medium">{customer.stampsBalance}</span>
              </div>
            </div>
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Type *</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="points"
                  checked={adjustmentData.adjustmentType === "points"}
                  onChange={(e) => setAdjustmentData(prev => ({ ...prev, adjustmentType: e.target.value as any }))}
                  className="mr-2"
                />
                Points
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="stamps"
                  checked={adjustmentData.adjustmentType === "stamps"}
                  onChange={(e) => setAdjustmentData(prev => ({ ...prev, adjustmentType: e.target.value as any }))}
                  className="mr-2"
                />
                Stamps
              </label>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              step="1"
              required
              placeholder="Enter positive or negative number"
              value={adjustmentData.amount}
              onChange={(e) => setAdjustmentData(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use negative numbers to subtract (e.g., -10)
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <select
              required
              value={adjustmentData.reason}
              onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="">Select a reason</option>
              <option value="Customer complaint resolution">Customer complaint resolution</option>
              <option value="Promotional bonus">Promotional bonus</option>
              <option value="Correction of error">Correction of error</option>
              <option value="Birthday bonus">Birthday bonus</option>
              <option value="Manual correction">Manual correction</option>
              <option value="Staff discretion">Staff discretion</option>
              <option value="System adjustment">System adjustment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              rows={3}
              placeholder="Optional additional details..."
              value={adjustmentData.notes}
              onChange={(e) => setAdjustmentData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Apply Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 

function SaveViewModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [viewName, setViewName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewName.trim()) {
      onSave(viewName.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Save Filter View</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Save your current filter settings as a reusable view
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">View Name</label>
            <input
              type="text"
              required
              placeholder="e.g., High Value Customers, Recent Signups"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Save View
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}