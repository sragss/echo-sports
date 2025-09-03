import { EchoSignIn, useEcho } from '@merit-systems/echo-react-sdk';
import AIComponent from './AIComponent';

function App() {
  const { isAuthenticated, user, balance, signOut } = useEcho();

  console.log(balance);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white border border-gray-200 shadow-lg">
          <div className="p-8">
            <div className="text-center">
              <h1 className="text-3xl font-light text-gray-900 tracking-tight mb-2">
                ECHO<span className="font-bold">SPORTS</span>
              </h1>
              <p className="text-gray-500 font-light mb-8 text-sm tracking-wide">
                INTELLIGENCE PLATFORM
              </p>
              
              <div className="border-t border-gray-200 pt-6">
                <p className="text-gray-600 text-sm mb-6 font-light">
                  Access required to generate sports intelligence reports
                </p>
                <EchoSignIn />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-light text-gray-900 tracking-tight">
                ECHO<span className="font-bold">SPORTS</span>
              </h1>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 font-mono">
                  Balance: {balance?.balance || '0.00'}
                </p>
              </div>
              
              <button 
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-gray-900 font-medium tracking-wider uppercase transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AIComponent />
    </div>
  );
}

export default App
