'use client'
import React, { useState, useEffect } from 'react';
import { Wallet, Send, RefreshCw, MessageCircle, X, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ethers } from 'ethers';

// Dynamically import XMTP with no SSR
const XMTPClientWrapper = dynamic(
  () => import('@xmtp/xmtp-js').then(mod => ({ default: mod.Client })),
  { ssr: false }
);

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
      initializeXMTPv3();
    }
  }, [account]);

  useEffect(() => {
    if (recipient && xmtpClient && recipient.length === 42) {
      checkRecipientXMTP();
    } else {
      setRecipientCanReceiveXMTP(null);
    }
  }, [recipient, xmtpClient]);

  const initializeXMTPv3 = async (): Promise<void> => {
    if (!account || !window.ethereum) return;
    
    try {
      console.log('🚀 Initializing XMTP v3...');
      setXmtpError('');
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      console.log('📝 Creating XMTP v3 client...');
      
      const client = await Client.create(signer, {
        env: 'production'
      });
      
      setXmtpClient(client);
      setXmtpEnabled(true);
      
      console.log('✅ XMTP v3 initialized successfully!');
      
      const allConversations = await client.conversations.list();
      setConversations(allConversations);
      
      setTxStatus('✨ XMTP v3 Connected!');
      setTimeout(() => setTxStatus(''), 3000);
      
    } catch (error: any) {
      console.error('❌ Error initializing XMTP v3:', error);
      setXmtpEnabled(false);
      setXmtpError(error.message || 'Failed to initialize XMTP v3');
      setTxStatus('⚠️ XMTP v3 initialization failed. Payments still work!');
      setTimeout(() => setTxStatus(''), 8000);
    }
  };

  const checkRecipientXMTP = async (): Promise<void> => {
    if (!xmtpClient || !recipient || recipient.length !== 42) {
      setRecipientCanReceiveXMTP(null);
      return;
    }

    try {
      setCheckingXMTP(true);
      const canReceive = await xmtpClient.canMessage(recipient);
      setRecipientCanReceiveXMTP(canReceive);
    } catch (error: any) {
      setRecipientCanReceiveXMTP(null);
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
          setTxStatus('Wallet connected successfully!');
          setTimeout(() => setTxStatus(''), 3000);
        }
      } catch (error: any) {
        console.error('Error connecting wallet:', error);
        setTxStatus('Failed to connect wallet');
      }
    } else {
      setTxStatus('MetaMask not detected');
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
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: token.address,
          data: transferData,
          value: '0x0'
        }],
      });

      setTxStatus(`Transaction sent! Hash: ${txHash.substring(0, 10)}...`);
      
      if (xmtpClient && recipientCanReceiveXMTP && memo) {
        try {
          const messageContent = `💸 Payment Received!

Amount: ${amount} ${token.symbol}
From: ${account.substring(0, 6)}...${account.substring(38)}
Transaction: ${txHash.substring(0, 10)}...
Message: ${memo}

Powered by Tempo + XMTP v3 🔐`;
          
          const conversation = await xmtpClient.conversations.newConversation(recipient);
          await conversation.send(messageContent);
          
          setTxStatus(`✅ Payment sent and XMTP v3 message delivered!`);
          
          const allConversations = await xmtpClient.conversations.list();
          setConversations(allConversations);
        } catch (xmtpError: any) {
          setTxStatus(`Payment sent but XMTP failed: ${xmtpError.message}`);
        }
      } else {
        setTxStatus(`✅ Payment sent successfully!`);
      }
      
      setRecipient('');
      setAmount('');
      setMemo('');
      setRecipientCanReceiveXMTP(null);
      
      setTimeout(() => getAllBalances(), 3000);
      
    } catch (error: any) {
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
      
      (async () => {
        try {
          const stream = await conversation.streamMessages();
          for await (const message of stream) {
            setMessages(prev => [...prev, message]);
          }
        } catch (err) {
          console.error('Stream error:', err);
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
      const msgs = await selectedConversation.messages();
      setMessages(msgs);
    } catch (error: any) {
      setTxStatus('Failed to send message');
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
            <p className="text-gray-600">Connect wallet to get started</p>
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Tempo Wallet</h1>
                  {xmtpEnabled && (
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-600">XMTP v3 Connected</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={disconnectWallet}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
              
              <div className="bg-gradient-to-r from-purple-100 to-cyan-100 rounded-xl p-4 mb-4">
                <div className="text-sm text-gray-600">Address</div>
                <div className="font-mono text-sm text-gray-800 break-all">{account}</div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-3">Balances</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(stablecoinBalances).map(([key, value]) => (
                    <div key={key} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                      <div className="text-sm text-gray-600">{key}</div>
                      <div className="text-2xl font-bold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                <div className="text-sm text-gray-600">Native Balance</div>
                <div className="text-3xl font-bold">{nativeBalance}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send Payment
              </h2>
              
              <div className="space-y-4">
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value as keyof typeof STABLECOINS)}
                  className="w-full px-4 py-3 border rounded-lg"
                >
                  {Object.keys(STABLECOINS).map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
                
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Recipient address (0x...)"
                  className="w-full px-4 py-3 border rounded-lg"
                />
                
                {recipientCanReceiveXMTP === true && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                    <CheckCircle className="w-4 h-4" />
                    Recipient can receive XMTP v3!
                  </div>
                )}
                
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full px-4 py-3 border rounded-lg"
                />
                
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Message (sent via XMTP if available)"
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg"
                />
                
                <button
                  onClick={sendPayment}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl font-semibold disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Send Payment'}
                </button>
              </div>
              
              {txStatus && (
                <div className="mt-4 p-4 rounded-lg text-sm bg-green-50 border border-green-200">
                  {txStatus}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                XMTP Chats
              </h2>

              {!xmtpEnabled ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin" />
                  <p className="text-sm text-gray-500">Initializing...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No conversations</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv, idx) => (
                    <button
                      key={idx}
                      onClick={() => openChat(conv)}
                      className="w-full p-3 rounded-lg hover:bg-gray-50 border text-left"
                    >
                      <div className="font-mono text-xs truncate">
                        {conv.peerAddress}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showChat && selectedConversation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold">Chat</h3>
                <button onClick={() => setShowChat(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.senderAddress === account ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] rounded-2xl p-3 ${
                      msg.senderAddress === account
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t flex gap-2">
                <input
                  type="text"
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type message..."
                  className="flex-1 px-4 py-2 border rounded-lg"
                />
                <button
                  onClick={sendChatMessage}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg"
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