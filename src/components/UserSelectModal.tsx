interface UserSelectModalProps {
  account: any;
  users: any[];
  onSelectUser: (userId: string) => void;
  onClose: () => void;
}

export function UserSelectModal({ account, users, onSelectUser, onClose }: UserSelectModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Select User to View As</h3>
            <p className="text-sm text-gray-600 mt-1">{account.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-3">
            {users.map((user) => (
              <button
                key={user._id}
                onClick={() => onSelectUser(user._id)}
                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-gray-900 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === "orgadmin" 
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {user.role}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === "active" 
                        ? "bg-green-100 text-green-800"
                        : user.status === "invited"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {user.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {users.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500">No users found for this account</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
