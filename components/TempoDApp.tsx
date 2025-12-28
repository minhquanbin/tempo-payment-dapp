'use client'
import React, { useState, useEffect } from 'react';
import { Wallet, Send, RefreshCw, MessageCircle, X, CheckCircle, AlertCircle, LogOut, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';

interface StablecoinBalances {
  AlphaUSD: string;
  BetaUSD: string;
  ThetaUSD: string;
}

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
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<keyof typeof STABLECOINS>('AlphaUSD');
  const [memo, setMemo] = useState<string>('');
  const [txStatus, setTxStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
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
    if (!account || !window.ethereum || typeof window === 'undefined') return;
    
    try {
      console.log('🚀 Initializing XMTP v3 testnet...');
      setXmtpError('');
      
      // Import XMTP JS SDK (stable v3)
      const { Client } = await import('@xmtp/xmtp-js');
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      console.log('📝 Creating XMTP v3 client with testnet environment...');
      
      // Create XMTP v3 client - use 'dev' for testnet
      const client = await Client.create(signer, {
        env: 'production' // XMTP testnet environment
      });
      
      setXmtpClient(client);
      setXmtpEnabled(true);
      
      console.log('✅ XMTP v3 testnet initialized!');
      console.log('🔑 Address:', client.address);
      
      // Load conversations
      await loadConversations(client);
      
      setTxStatus('✨ XMTP v3 Testnet Connected!');
      setTimeout(() => setTxStatus(''), 3000);
      
    } catch (error: any) {
      console.error('❌ Error initializing XMTP v3:', error);
      console.error('Full error:', JSON.stringify(error, null, 2));
      setXmtpEnabled(false);
      
      // Better error messaging
      if (error.message?.includes('Failed to fetch')) {
        setXmtpError('Network error - XMTP testnet may be unreachable');
      } else if (error.message?.includes('User rejected')) {
        setXmtpError('User rejected signature request');
      } else {
        setXmtpError(error.message || 'Failed to initialize XMTP v3 testnet');
      }
      
      setTxStatus('⚠️ XMTP unavailable. Payments still work without messaging!');
      setTimeout(() => setTxStatus(''), 8000);
    }
  };

  const loadConversations = async (client: any): Promise<void> => {
    try {
      console.log('📬 Loading conversations...');
      
      // List all conversations (both DMs and groups in v3)
      const allConversations = await client.conversations.list();
      console.log(`Found ${allConversations.length} conversations`);
      
      setConversations(allConversations);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
    }
  };

  const checkRecipientXMTP = async (): Promise<void> => {
    if (!xmtpClient || !recipient || recipient.length !== 42) {
      setRecipientCanReceiveXMTP(null);
      return;
    }

    try {
      setCheckingXMTP(true);
      console.log('🔍 Checking if recipient can message:', recipient);
      
      // Check if address is on XMTP network
      const canMessage = await xmtpClient.canMessage([recipient]);
      const recipientStatus = canMessage[recipient.toLowerCase()];
      
      console.log('Can message:', recipientStatus);
      setRecipientCanReceiveXMTP(recipientStatus || false);
      
    } catch (error: any) {
      console.error('Error checking XMTP:', error);
      setRecipientCanReceiveXMTP(false);
    } finally {
      setCheckingXMTP(false);
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
          setTxStatus('✅ Wallet connected successfully!');
          setTimeout(() => setTxStatus(''), 3000);
        }
      } catch (error: any) {
        console.error('Error connecting wallet:', error);
        setTxStatus('❌ Failed to connect wallet');
      }
    } else {
      setTxStatus('❌ MetaMask not detected. Please install MetaMask.');
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
        console.error('Error getting balance:', error);
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
      
      if (!result || result === '0x') return '0.00';
      
      const balanceInTokens = parseInt(result, 16) / Math.pow(10, token.decimals);
      return balanceInTokens.toFixed(2);
    } catch (error: any) {
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
    } finally {
      setIsLoading(false);
    }
  };

  const sendPayment = async (): Promise<void> => {
    if (!account || !recipient || !amount || !window.ethereum) {
      setTxStatus('⚠️ Please fill all required fields');
      return;
    }

    try {
      setTxStatus('⏳ Processing transaction on Tempo testnet...');
      setIsLoading(true);
      
      const token = STABLECOINS[selectedToken];
      const amountInSmallestUnit = Math.floor(parseFloat(amount) * Math.pow(10, token.decimals));
      
      const recipientPadded = recipient.slice(2).padStart(64, '0');
      const amountHex = amountInSmallestUnit.toString(16).padStart(64, '0');
      const transferData = '0xa9059cbb' + recipientPadded + amountHex;
      
      console.log('💸 Sending payment...');
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: token.address,
          data: transferData,
          value: '0x0'
        }],
      });

      console.log('✅ Tempo transaction sent:', txHash);
      setTxStatus(`✅ Payment sent! TX: ${txHash.substring(0, 10)}...`);
      
      // Send XMTP notification if recipient is on network
      if (xmtpClient && recipientCanReceiveXMTP && memo) {
        try {
          console.log('📤 Sending XMTP notification...');
          
          const messageContent = `💸 Payment Notification

Amount: ${amount} ${token.symbol}
From: ${account.substring(0, 6)}...${account.substring(38)}
Tx Hash: ${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}
Network: Tempo Testnet

Message: ${memo}

Powered by Tempo + XMTP v3 🚀`;
          
          // Create DM conversation in v3
          const conversation = await xmtpClient.conversations.newConversation(recipient);
          await conversation.send(messageContent);
          
          console.log('✅ XMTP notification delivered!');
          setTxStatus(`🎉 Payment sent + XMTP notification delivered!`);
          
          // Refresh conversations
          await loadConversations(xmtpClient);
          
        } catch (xmtpError: any) {
          console.error('XMTP send error:', xmtpError);
          setTxStatus(`✅ Payment sent but XMTP notification failed: ${xmtpError.message}`);
        }
      } else {
        if (!recipientCanReceiveXMTP) {
          setTxStatus(`✅ Payment sent! (Recipient not on XMTP)`);
        } else {
          setTxStatus(`✅ Payment sent successfully!`);
        }
      }
      
      // Clear form
      setRecipient('');
      setAmount('');
      setMemo('');
      setRecipientCanReceiveXMTP(null);
      
      // Refresh balances
      setTimeout(() => getAllBalances(), 3000);
      
    } catch (error: any) {
      console.error('Transaction error:', error);
      setTxStatus('❌ Transaction failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const openChat = async (conversation: any): Promise<void> => {
    if (!xmtpClient) return;
    
    try {
      setSelectedConversation(conversation);
      setShowChat(true);
      
      console.log('📖 Loading messages from conversation...');
      
      // Load all messages from conversation
      const allMessages = await conversation.messages();
      console.log(`Loaded ${allMessages.length} messages`);
      setMessages(allMessages);
      
      // Stream new messages
      console.log('👂 Starting message stream...');
      for await (const message of await conversation.streamMessages()) {
        console.log('📨 New message received:', message);
        setMessages(prev => [...prev, message]);
      }
      
    } catch (error: any) {
      console.error('Error opening chat:', error);
      setTxStatus('❌ Failed to load chat');
      setTimeout(() => setTxStatus(''), 3000);
    }
  };

  const sendChatMessage = async (): Promise<void> => {
    if (!selectedConversation || !newChatMessage.trim()) return;
    
    try {
      console.log('📤 Sending chat message...');
      await selectedConversation.send(newChatMessage);
      setNewChatMessage('');
      
      // Reload messages
      const allMessages = await selectedConversation.messages();
      setMessages(allMessages);
      
      console.log('✅ Message sent!');
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      setTxStatus('❌ Failed to send message: ' + error.message);
      setTimeout(() => setTxStatus(''), 3000);
    }
  };

  const disconnectWallet = (): void => {
    setAccount(null);
    setNativeBalance('0');
    setStablecoinBalances({ AlphaUSD: '0', BetaUSD: '0', ThetaUSD: '0' });
    setXmtpClient(null);
    setXmtpEnabled(false);
    setConversations([]);
    setTxStatus('👋 Wallet disconnected');
    setTimeout(() => setTxStatus(''), 3000);
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-purple-600 to-cyan-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Tempo + XMTP v3</h1>
            <p className="text-gray-600 mb-2">Secure payments with encrypted messaging</p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">Tempo Testnet</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">XMTP v3</span>
            </div>
          </div>
          
          <button
            onClick={connectWallet}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            Connect MetaMask
          </button>
          
          {txStatus && (
            <div className="mt-4 p-3 rounded-lg text-sm bg-blue-50 border border-blue-200 text-blue-800">
              {txStatus}
            </div>
          )}

          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-sm text-gray-800 mb-2">✨ Features:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Send payments on Tempo testnet</li>
              <li>• Encrypted messages via XMTP v3</li>
              <li>• Payment notifications onchain</li>
              <li>• Decentralized messaging network</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Network Status Banner */}
        <div className="mb-4 bg-white rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">Tempo Testnet</span>
            </div>
            {xmtpEnabled && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">XMTP v3 Dev Network</span>
              </div>
            )}
          </div>
          <button
            onClick={disconnectWallet}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Wallet Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet Info */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Tempo Wallet</h1>
                <div className="flex flex-wrap items-center gap-2">
                  {xmtpEnabled && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs text-green-700 font-medium">XMTP v3 Active</span>
                    </div>
                  )}
                  {xmtpError && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-xs text-orange-700">Messaging unavailable</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-100 to-cyan-100 rounded-xl p-4 mb-4">
                <div className="text-sm text-gray-600 mb-1">Connected Address</div>
                <div className="font-mono text-sm text-gray-800 break-all">{account}</div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Stablecoin Balances</h3>
                  <button
                    onClick={getAllBalances}
                    disabled={isLoading}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(stablecoinBalances).map(([key, value]) => (
                    <div key={key} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                      <div className="text-xs text-gray-600 mb-1">{key}</div>
                      <div className="text-xl font-bold text-gray-800">{value}</div>
                      <div className="text-xs text-gray-500">{STABLECOINS[key as keyof typeof STABLECOINS].symbol}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border-2 border-yellow-200">
                <div className="text-sm text-gray-600 mb-1">Native Balance (TEMO)</div>
                <div className="text-2xl font-bold text-gray-800">{nativeBalance}</div>
              </div>
            </div>

            {/* Send Payment Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-600" />
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {Object.keys(STABLECOINS).map(key => (
                      <option key={key} value={key}>
                        {key} ({STABLECOINS[key as keyof typeof STABLECOINS].symbol})
                      </option>
                    ))}
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                  />
                  {checkingXMTP && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking XMTP v3 availability...
                    </div>
                  )}
                  {recipientCanReceiveXMTP === true && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg mt-2 border border-green-200">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">✨ Recipient on XMTP v3! Notification will be sent.</span>
                    </div>
                  )}
                  {recipientCanReceiveXMTP === false && (
                    <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg mt-2 border border-orange-200">
                      <AlertCircle className="w-4 h-4" />
                      <span>Recipient not on XMTP v3. Payment will still work.</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Sent via XMTP v3 if recipient available)
                  </label>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="Add a payment note..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>
                
                <button
                  onClick={sendPayment}
                  disabled={isLoading || !recipient || !amount}
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Payment
                    </>
                  )}
                </button>
              </div>
              
              {txStatus && (
                <div className="mt-4 p-4 rounded-lg text-sm bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 text-blue-800">
                  {txStatus}
                </div>
              )}
            </div>
          </div>

          {/* XMTP Chat Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-600" />
                XMTP v3 Messages
              </h2>

              {!xmtpEnabled ? (
                <div className="text-center py-8">
                  {xmtpError ? (
                    <>
                      <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-2 font-medium">XMTP Unavailable</p>
                      <p className="text-xs text-gray-500 mb-3">{xmtpError}</p>
                      <button
                        onClick={initializeXMTP}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Try Again
                      </button>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin" />
                      <p className="text-sm text-gray-600">Initializing XMTP v3...</p>
                    </>
                  )}
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-1">No conversations yet</p>
                  <p className="text-xs text-gray-400">Send a payment with message to start</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {conversations.map((conv, idx) => (
                    <button
                      key={idx}
                      onClick={() => openChat(conv)}
                      className="w-full p-3 rounded-lg hover:bg-gray-50 border border-gray-200 text-left transition-colors group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MessageCircle className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
                        <span className="text-xs text-gray-500">Chat {idx + 1}</span>
                      </div>
                      <div className="font-mono text-xs text-gray-700 truncate">
                        {conv.peerAddress}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Modal */}
        {showChat && selectedConversation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
              <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-purple-50 to-cyan-50">
                <div>
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-purple-600" />
                    XMTP v3 Chat
                  </h3>
                  <p className="text-xs text-gray-600 font-mono truncate max-w-md mt-1">
                    {selectedConversation.peerAddress}
                  </p>
                </div>
                <button 
                  onClick={() => setShowChat(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.senderInboxId === xmtpClient?.inboxId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] rounded-2xl p-3 ${
                        msg.senderInboxId === xmtpClient?.inboxId
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}>
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </div>
                        <div className={`text-xs mt-1 ${
                          msg.senderInboxId === xmtpClient?.inboxId ? 'text-purple-100' : 'text-gray-500'
                        }`}>
                          {new Date(msg.sentAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t bg-white flex gap-2">
                <input
                  type="text"
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!newChatMessage.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TempoDApp;