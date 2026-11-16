export const EmptyStateMessage = ({
  title,
  message,
  icon,
  showCreateButton = false,
  onCreateClick,
  createButtonText = "Create"
}: {
  title: string;
  message: string;
  icon?: React.ReactNode;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
  createButtonText?: string;
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-800 rounded-lg border border-gray-700">
    <div className="bg-gray-700 rounded-full p-6 mb-4">
      {icon || (
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      )}
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
    <p className="text-gray-400 text-center max-w-md mb-6">{message}</p>

    {showCreateButton && (
      <button
        onClick={onCreateClick}
        className="px-5 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-lg transition-colors flex items-center font-medium"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
        {createButtonText}
      </button>
    )}
  </div>
);