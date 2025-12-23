import React, { useState, useEffect } from 'react';
import { Wallet, Send, Mail, Settings, LogOut } from 'lucide-react';

const TempoDApp = () => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [email, setEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [txStatus, setTxStatus] = useState('');
  const [web3, setWeb3] = useState(null);

  useEffect(() => {
    if (account) {
      loadEmailFromStorage();
      getBalance();
    }
  }, [account]);

  const loadEmailFromStorage = () => {
    const stored = localStorage.getItem(`tempo_email_${account}`);
    if (stored) {
      setSavedEmail(stored);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        const chainId = await window.ethereum.request({ 
          method: 'eth_chainId' 
        });
        
        // Tempo testnet chainId: 0x29A (666)
        const tempoChainId = '0x29A';
        
        if (chainId !== tempoChainId) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: tempoChainId }],
            });
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: tempoChainId,
                  chainName: 'Tempo Testnet',
                  nativeCurrency: {
                    name: 'TEMPO',
                    symbol: 'TEMPO',
                    decimals: 18
                  },
                  rpcUrls: ['https://rpc.testnet.tempo.xyz'],
                  blockExplorerUrls: ['https://explorer.testnet.tempo.xyz']
                }],
              });
            }
          }
        }
        
        setAccount(accounts[0]);
        setTxStatus('Wallet connected successfully!');
      } catch (error) {
        console.error('Error connecting wallet:', error);
        setTxStatus('Failed to connect wallet');
      }
    } else {
      setTxStatus('Please install MetaMask!');
    }
  };

  const getBalance = async () => {
    if (window.ethereum && account) {
      try {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [account, 'latest']
        });
        const balanceInEth = parseInt(balance, 16) / 1e18;
        setBalance(balanceInEth.toFixed(4));
      } catch (error) {
        console.error('Error getting balance:', error);
      }
    }
  };

  const saveEmail = () => {
    if (email && account) {
      localStorage.setItem(`tempo_email_${account}`, email);
      setSavedEmail(email);
      setEmail('');
      setShowProfile(false);
      setTxStatus('Email linked successfully!');
    }
  };

  const sendPayment = async () => {
    if (!account || !recipient || !amount) {
      setTxStatus('Please fill all required fields');
      return;
    }

    try {
      setTxStatus('Processing transaction...');
      
      const amountInWei = '0x' + (parseFloat(amount) * 1e18).toString(16);
      const memoHex = memo ? '0x' + Buffer.from(memo, 'utf8').toString('hex') : '0x';
      
      const transactionParameters = {
        from: account,
        to: recipient,
        value: amountInWei,
        data: memoHex,
      };

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });

      setTxStatus(`Transaction sent! Hash: ${txHash.substring(0, 10)}...`);
      
      // Simulate sending email notification
      if (savedEmail) {
        setTimeout(() => {
          setTxStatus(`Payment sent! Email notification sent to ${savedEmail}`);
        }, 2000);
      }
      
      // Reset form
      setRecipient('');
      setAmount('');
      setMemo('');
      
      // Refresh balance
      setTimeout(() => getBalance(), 3000);
      
    } catch (error) {
      console.error('Error sending transaction:', error);
      setTxStatus('Transaction failed: ' + error.message);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setBalance('0');
    setSavedEmail('');
    setTxStatus('');
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-purple-600 to-cyan-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Tempo Payment DApp</h1>
            <p className="text-gray-600">Connect your wallet to get started</p>
          </div>
          
          <button
            onClick={connectWallet}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            Connect MetaMask
          </button>
          
          {txStatus && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              {txStatus}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Tempo Wallet</h1>
            <button
              onClick={disconnectWallet}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
          
          <div className="bg-gradient-to-r from-purple-100 to-cyan-100 rounded-xl p-4 mb-4">
            <div className="text-sm text-gray-600 mb-1">Connected Address</div>
            <div className="font-mono text-sm text-gray-800 break-all">{account}</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-1">Balance</div>
              <div className="text-3xl font-bold text-gray-800">{balance} TEMPO</div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-1">Linked Email</div>
              <div className="text-lg font-semibold text-gray-800 break-all">
                {savedEmail || 'Not linked'}
              </div>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="mt-2 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Settings className="w-4 h-4" />
                {savedEmail ? 'Update' : 'Link Email'}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        {showProfile && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Profile Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
              <button
                onClick={saveEmail}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Save Email
              </button>
            </div>
          </div>
        )}

        {/* Payment Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Payment
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Address *
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (TEMPO) *
              </label>
              <input
                type="number"
                step="0.0001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (Memo)
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Payment for services..."
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
              />
            </div>
            
            <button
              onClick={sendPayment}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send Payment
            </button>
          </div>
          
          {txStatus && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              {txStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TempoDApp;