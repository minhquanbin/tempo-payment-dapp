import React, { useState, useEffect } from 'react';
import { Wallet, Send, Mail, Settings, LogOut, RefreshCw, MessageCircle, X, CheckCircle, AlertCircle } from 'lucide-react';

// TypeScript interfaces
interface StablecoinBalances {
  AlphaUSD: string;
  BetaUSD: string;
  ThetaUSD: string;
}

interface Message {
  id: string;
  content: string;
  senderAddress: string;
  sent: Date;
}

interface Conversation {
  peerAddress: string;
  send: (message: string) => Promise<any>;
  messages: () => Promise<any[]>;
  streamMessages: () => AsyncIterableIterator<any>;
}

// Địa chỉ contract của các stablecoin trên Tempo testnet
const STABLECOINS = {
  AlphaUSD: {
    address: '0x20c0000000000000000000000000000000000001',
    name: 'AlphaUSD',
    symbol: 'AUSD',
    decimals: 6
  },
  BetaUSD: {
    address: '0x20c0000000000000000000000000000000000002',
    name: 'BetaUSD',
    symbol: 'BUSD',
    decimals: 6
  },
  ThetaUSD: {
    address: '0x20c0000000000000000000000000000000000003',
    name: 'ThetaUSD',
    symbol: 'TUSD',
    decimals: 6
  }
};

const TempoDApp: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [nativeBalance, setNativeBalance] = useState<string>('0');
  const [stablecoinBalances, setStablecoinBalances] = useState<StablecoinBalances>({
    AlphaUSD: '0',
    BetaUSD: '0',
    ThetaUSD: '0'
  });
  const [email, setEmail] = useState<string>('');
  const [savedEmail, setSavedEmail] = useState<string>('');
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<keyof typeof STABLECOINS>('AlphaUSD');
  const [memo, setMemo] = useState<string>('');
  const [txStatus, setTxStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // XMTP States
  const [xmtpClient, setXmtpClient] = useState<any>(null);
  const [xmtpEnabled, setXmtpEnabled] = useState<boolean>(false);
  const [recipientCanReceiveXMTP, setRecipientCanReceiveXMTP] = useState<boolean | null>(null);
  const [checkingXMTP, setCheckingXMTP] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState<string>('');
  const [xmtpError, setXmtpError] = useState<string>('');

  useEffect(() => {
    if (account) {
      loadEmailFromStorage();
      getAllBalances();
      initializeXMTP();
    }
  }, [account]);

  useEffect(() => {
    if (recipient && xmtpClient && recipient.length === 42) {
      checkRecipientXMTP();
    } else {
      setRecipientCanReceiveXMTP(null);
    }
  }, [recipient, xmtpClient]);

  const initializeXMTP = async (): Promise<void> => {
    if (!account || !window.ethereum) return;
    
    try {
      console.log('🚀 Initializing Real XMTP...');
      setXmtpError('');
      
      // Dynamically import XMTP modules
      const { Client } = await import('@xmtp/xmtp-js');
      const { ethers } = await import('ethers');
      
      // Create ethers provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      console.log('📝 Creating XMTP client with signer...');
      
      // Create XMTP client with production environment
      const client = await Client.create(signer, {
        env: 'production' // Use 'dev' for testing, 'production' for mainnet
      });
      
      setXmtpClient(client);
      setXmtpEnabled(true);
      
      console.log('✅ Real XMTP initialized successfully!');
      console.log('📧 XMTP Address:', client.address);
      
      // Load existing conversations
      const allConversations = await client.conversations.list();
      setConversations(allConversations);
      console.log(`💬 Found ${allConversations.length} conversations`);
      
      setTxStatus('✨ Real XMTP Connected!');
      setTimeout(() => setTxStatus(''), 3000);
      
    } catch (error: any) {
      console.error('❌ Error initializing XMTP:', error);
      setXmtpEnabled(false);
      setXmtpError(error.message || 'Failed to initialize XMTP');
      
      // Provide helpful error messages
      if (error.message?.includes('account') || error.message?.includes('signer')) {
        setTxStatus('⚠️ XMTP: Please ensure wallet is connected properly');
      } else if (error.message?.includes('network')) {
        setTxStatus('⚠️ XMTP: Network connection issue. Payments still work!');
      } else {
        setTxStatus('⚠️ XMTP initialization failed. Payments still work!');
      }
      
      setTimeout(() => setTxStatus(''), 5000);
    }
  };

  const checkRecipientXMTP = async (): Promise<void> => {
    if (!xmtpClient || !recipient || recipient.length !== 42) {
      setRecipientCanReceiveXMTP(null);
      return;
    }

    try {
      setCheckingXMTP(true);
      console.log('🔍 Checking Real XMTP availability for:', recipient);
      
      const canReceive = await xmtpClient.canMessage(recipient);
      setRecipientCanReceiveXMTP(canReceive);
      
      if (canReceive) {
        console.log('✅ Recipient can receive Real XMTP messages');
      } else {
        console.log('❌ Recipient cannot receive XMTP (they need to enable XMTP first)');
      }
    } catch (error: any) {
      console.error('Error checking XMTP:', error);
      setRecipientCanReceiveXMTP(null);
    } finally {
      setCheckingXMTP(false);
    }
  };

  const loadEmailFromStorage = (): void => {
    try {
      const stored = localStorage.getItem(`tempo_email_${account}`);
      if (stored) {
        setSavedEmail(stored);
      }
    } catch (error: any) {
      console.error('Error loading email:', error);
    }
  };

  const connectWallet = async (): Promise<void> => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          setTxStatus('Wallet connected successfully!');
          setTimeout(() => setTxStatus(''), 3000);
        } else {
          setTxStatus('No accounts found. Please unlock MetaMask.');
        }
      } catch (error: any) {
        console.error('Error connecting wallet:', error);
        if (error.code === 4001) {
          setTxStatus('Connection rejected. Please approve in MetaMask.');
        } else if (error.code === -32002) {
          setTxStatus('Connection request pending. Please check MetaMask.');
        } else {
          setTxStatus('Failed to connect: ' + (error.message || 'Unknown error'));
        }
      }
    } else {
      setTxStatus('MetaMask not detected. Please install MetaMask extension.');
    }
  };

  const getNativeBalance = async (): Promise<void> => {
    if (window.ethereum && account) {
      try {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [account, 'latest']
        });
        const balanceInEth = parseInt(balance, 16) / 1e18;
        setNativeBalance(balanceInEth.toFixed(4));
      } catch (error: any) {
        console.error('Error getting native balance:', error);
      }
    }
  };

  const getStablecoinBalance = async (tokenKey: keyof typeof STABLECOINS): Promise<string> => {
    if (!window.ethereum || !account) return '0';
    
    try {
      const token = STABLECOINS[tokenKey];
      const addressParam = account.toLowerCase().slice(2).padStart(64, '0');
      const data = '0x70a08231' + addressParam;
      
      const result = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: token.address,
          data: data
        }, 'latest']
      });
      
      if (!result || result === '0x') {
        return '0.00';
      }
      
      const balanceInTokens = parseInt(result, 16) / Math.pow(10, token.decimals);
      return balanceInTokens.toFixed(2);
    } catch (error: any) {
      console.error(`Error getting ${tokenKey} balance:`, error);
      return '0.00';
    }
  };

  const getAllBalances = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await getNativeBalance();
      
      const alphaBalance = await getStablecoinBalance('AlphaUSD');
      const betaBalance = await getStablecoinBalance('BetaUSD');
      const thetaBalance = await getStablecoinBalance('ThetaUSD');
      
      setStablecoinBalances({
        AlphaUSD: alphaBalance,
        BetaUSD: betaBalance,
        ThetaUSD: thetaBalance
      });
    } catch (error: any) {
      console.error('Error getting balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEmail = (): void => {
    if (email && account) {
      try {
        localStorage.setItem(`tempo_email_${account}`, email);
        setSavedEmail(email);
        setEmail('');
        setShowProfile(false);
        setTxStatus('Email linked successfully!');
        setTimeout(() => setTxStatus(''), 3000);
      } catch (error: any) {
        console.error('Error saving email:', error);
        setTxStatus('Failed to save email');
      }
    }
  };

  const sendPayment = async (): Promise<void> => {
    if (!account || !recipient || !amount || !window.ethereum) {
      setTxStatus('Please fill all required fields');
      return;
    }

    try {
      setTxStatus('Processing transaction...');
      setIsLoading(true);
      
      const token = STABLECOINS[selectedToken];
      const amountInSmallestUnit = Math.floor(parseFloat(amount) * Math.pow(10, token.decimals));
      
      const recipientPadded = recipient.slice(2).padStart(64, '0');
      const amountHex = amountInSmallestUnit.toString(16).padStart(64, '0');
      const transferData = '0xa9059cbb' + recipientPadded + amountHex;
      
      const transactionParameters = {
        from: account,
        to: token.address,
        data: transferData,
        value: '0x0'
      };

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });

      setTxStatus(`Transaction sent! Hash: ${txHash.substring(0, 10)}...`);
      
      // Send Real XMTP message if enabled and recipient can receive
      if (xmtpClient && recipientCanReceiveXMTP && memo) {
        try {
          console.log('📤 Sending Real XMTP message...');
          
          const messageContent = `💸 Payment Received!

Amount: ${amount} ${token.symbol}
From: ${account.substring(0, 6)}...${account.substring(38)}
Transaction: ${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}
Message: ${memo}

View on Tempo Explorer: https://explorer.testnet.tempo.xyz/tx/${txHash}

Powered by Tempo + Real XMTP Protocol 🔐`;
          
          const conversation = await xmtpClient.conversations.newConversation(recipient);
          await conversation.send(messageContent);
          
          console.log('✅ Real XMTP message sent successfully!');
          setTxStatus(`✅ Payment sent and Real XMTP message delivered!`);
          
          // Refresh conversations list
          const allConversations = await xmtpClient.conversations.list();
          setConversations(allConversations);
        } catch (xmtpError: any) {
          console.error('❌ Real XMTP message failed:', xmtpError);
          setTxStatus(`Payment sent but XMTP message failed: ${xmtpError.message}`);
        }
      } else if (!xmtpClient) {
        setTxStatus(`✅ Payment sent! (XMTP not available)`);
      } else if (!recipientCanReceiveXMTP) {
        setTxStatus(`✅ Payment sent! (Recipient doesn't have XMTP enabled)`);
      } else {
        setTxStatus(`✅ Payment sent successfully!`);
      }
      
      // Reset form
      setRecipient('');
      setAmount('');
      setMemo('');
      setRecipientCanReceiveXMTP(null);
      
      // Refresh balances
      setTimeout(() => getAllBalances(), 3000);
      
    } catch (error: any) {
      console.error('Error sending transaction:', error);
      setTxStatus('Transaction failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openChat = async (conversation: any): Promise<void> => {
    if (!xmtpClient) return;
    
    setSelectedConversation(conversation);
    setShowChat(true);
    
    try {
      const msgs = await conversation.messages();
      setMessages(msgs);
      
      // Stream new messages in real-time
      (async () => {
        try {
          const stream = await conversation.streamMessages();
          for await (const message of stream) {
            setMessages(prev => [...prev, message]);
          }
        } catch (streamError) {
          console.error('Error streaming messages:', streamError);
        }
      })();
    } catch (error: any) {
      console.error('Error loading messages:', error);
    }
  };

  const sendChatMessage = async (): Promise<void> => {
    if (!selectedConversation || !newChatMessage.trim()) return;
    
    try {
      await selectedConversation.send(newChatMessage);
      setNewChatMessage('');
      
      // Refresh messages
      const msgs = await selectedConversation.messages();
      setMessages(msgs);
    } catch (error: any) {
      console.error('Error sending message:', error);
      setTxStatus('Failed to send message: ' + error.message);
      setTimeout(() => setTxStatus(''), 3000);
    }
  };

  const disconnectWallet = (): void => {
    setAccount(null);
    setNativeBalance('0');
    setStablecoinBalances({
      AlphaUSD: '0',
      BetaUSD: '0',
      ThetaUSD: '0'
    });
    setSavedEmail('');
    setTxStatus('');
    setXmtpClient(null);
    setXmtpEnabled(false);
    setConversations([]);
    setXmtpError('');
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-purple-600 to-cyan-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Tempo + Real XMTP</h1>
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
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              txStatus.includes('success') || txStatus.includes('Successfully') 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : txStatus.includes('Failed') || txStatus.includes('rejected') || txStatus.includes('not detected')
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              {txStatus}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Setup Instructions
            </h3>
            <ol className="text-sm text-gray-600 space-y-2">
              <li>1. Install MetaMask extension</li>
              <li>2. Add Tempo Testnet:
                <div className="mt-2 ml-4 p-2 bg-white rounded border text-xs font-mono">
                  <div>Network: Tempo Testnet</div>
                  <div>RPC: https://rpc.testnet.tempo.xyz</div>
                  <div>Chain ID: 42429</div>
                  <div>Symbol: USD</div>
                </div>
              </li>
              <li>3. Get tokens: <a href="https://docs.tempo.xyz/quickstart/faucet" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Faucet</a></li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Real XMTP Protocol
            </h3>
            <p className="text-sm text-purple-700">
              🔐 Encrypted wallet-to-wallet messaging using real XMTP network!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Tempo Wallet</h1>
                  {xmtpEnabled && (
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">Real XMTP Connected ✨</span>
                    </div>
                  )}
                  {!xmtpEnabled && account && (
                    <div className="flex items-center gap-2 mt-1">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span className="text-xs text-orange-600 font-medium">
                        {xmtpError ? `XMTP Error: ${xmtpError.substring(0, 30)}...` : 'Real XMTP Initializing...'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={getAllBalances}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={disconnectWallet}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-100 to-cyan-100 rounded-xl p-4 mb-4">
                <div className="text-sm text-gray-600 mb-1">Connected Address</div>
                <div className="font-mono text-sm text-gray-800 break-all mb-3">{account}</div>
                
                <div className="flex gap-2 flex-wrap">
                  <a
                    href="https://docs.tempo.xyz/quickstart/faucet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    <Wallet className="w-4 h-4" />
                    Get Testnet Tokens
                  </a>
                  <button
                    onClick={getAllBalances}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh Balances
                  </button>
                </div>
              </div>
              
              {/* Stablecoin Balances */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">Stablecoin Balances</h3>
                  {(stablecoinBalances.AlphaUSD === '0.00' && 
                    stablecoinBalances.BetaUSD === '0.00' && 
                    stablecoinBalances.ThetaUSD === '0.00') && (
                    <div className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                      No stablecoins - Get from faucet ↑
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                    <div className="text-sm text-gray-600 mb-1">AlphaUSD</div>
                    <div className="text-2xl font-bold text-gray-800">{stablecoinBalances.AlphaUSD}</div>
                    <div className="text-xs text-gray-500 mt-1">AUSD</div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl p-4 border-2 border-blue-200">
                    <div className="text-sm text-gray-600 mb-1">BetaUSD</div>
                    <div className="text-2xl font-bold text-gray-800">{stablecoinBalances.BetaUSD}</div>
                    <div className="text-xs text-gray-500 mt-1">BUSD</div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                    <div className="text-sm text-gray-600 mb-1">ThetaUSD</div>
                    <div className="text-2xl font-bold text-gray-800">{stablecoinBalances.ThetaUSD}</div>
                    <div className="text-xs text-gray-500 mt-1">TUSD</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border-2 border-yellow-200">
                  <div className="text-sm text-gray-600 mb-1">Native Balance (pathUSD)</div>
                  <div className="text-3xl font-bold text-gray-800">{nativeBalance}</div>
                  <div className="text-xs text-gray-500 mt-1">Used for gas fees</div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
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
              <div className="bg-white rounded-2xl shadow-xl p-6">
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
                    Select Token
                  </label>
                  <select
                    value={selectedToken}
                    onChange={(e) => setSelectedToken(e.target.value as keyof typeof STABLECOINS)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  >
                    <option value="AlphaUSD">AlphaUSD (Balance: {stablecoinBalances.AlphaUSD})</option>
                    <option value="BetaUSD">BetaUSD (Balance: {stablecoinBalances.BetaUSD})</option>
                    <option value="ThetaUSD">ThetaUSD (Balance: {stablecoinBalances.ThetaUSD})</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                  {checkingXMTP && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Checking Real XMTP availability...
                    </div>
                  )}
                  {recipientCanReceiveXMTP === true && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                      <CheckCircle className="w-4 h-4" />
                      ✨ Recipient can receive Real XMTP messages!
                    </div>
                  )}
                  {recipientCanReceiveXMTP === false && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
                      <AlertCircle className="w-4 h-4" />
                      Recipient cannot receive XMTP (payment will still work)
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Optional - sent via Real XMTP if available)
                  </label>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="Payment for services..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                  />
                  {recipientCanReceiveXMTP && memo && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      ✨ This message will be sent via Real XMTP protocol (encrypted & decentralized)
                    </p>
                  )}
                </div>
                
                <button
                  onClick={sendPayment}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                  {isLoading ? 'Processing...' : 'Send Payment'}
                </button>
              </div>
              
              {txStatus && (
                <div className={`mt-4 p-4 rounded-lg text-sm ${
                  txStatus.includes('success') || txStatus.includes('Successfully') || txStatus.includes('sent') || txStatus.includes('✅')
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : txStatus.includes('Failed') || txStatus.includes('failed')
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-blue-50 border border-blue-200 text-blue-800'
                }`}>
                  {txStatus}
                </div>
              )}
            </div>
          </div>

          {/* XMTP Chat Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Real XMTP Chats
                </h2>
                {xmtpEnabled && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>

              {!xmtpEnabled && !xmtpError && (
                <div className="text-center py-8">
                  <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin" />
                  <p className="text-sm text-gray-500">Initializing Real XMTP...</p>
                  <p className="text-xs text-gray-400 mt-2">Please wait...</p>
                </div>
              )}

              {xmtpError && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                  <p className="text-sm text-orange-600">XMTP initialization failed</p>
                  <p className="text-xs text-gray-500 mt-2">Payments still work normally!</p>
                  <button
                    onClick={initializeXMTP}
                    className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                  >
                    Retry XMTP
                  </button>
                </div>
              )}

              {xmtpEnabled && conversations.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No conversations yet</p>
                  <p className="text-xs text-gray-400 mt-2">Send a payment with a message to start chatting!</p>
                </div>
              )}

              {xmtpEnabled && conversations.length > 0 && (
                <div className="space-y-2">
                  {conversations.map((conversation, idx) => (
                    <button
                      key={idx}
                      onClick={() => openChat(conversation)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-semibold">
                          {conversation.peerAddress.substring(2, 4).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs text-gray-800 truncate">
                            {conversation.peerAddress.substring(0, 6)}...{conversation.peerAddress.substring(38)}
                          </div>
                          <div className="text-xs text-gray-500">Click to view chat</div>
                        </div>
                        <MessageCircle className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700">
                  🔐 Messages are encrypted end-to-end using Real XMTP protocol
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Modal */}
        {showChat && selectedConversation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800">Real XMTP Chat</h3>
                  <p className="text-xs font-mono text-gray-500">
                    {selectedConversation.peerAddress.substring(0, 6)}...{selectedConversation.peerAddress.substring(38)}
                  </p>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No messages yet. Start the conversation!
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.senderAddress === account ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl p-3 ${
                        msg.senderAddress === account
                          ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
                      <div
                        className={`text-xs mt-1 ${
                          msg.senderAddress === account ? 'text-purple-100' : 'text-gray-500'
                        }`}
                      >
                        {new Date(msg.sent).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!newChatMessage.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  🔐 Messages encrypted with Real XMTP protocol
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TempoDApp;