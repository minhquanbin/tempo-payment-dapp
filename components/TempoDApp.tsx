import React, { useState, useEffect } from 'react';
import { Wallet, Send, Settings, LogOut, RefreshCw, MessageCircle, CheckCircle, AlertCircle } from 'lucide-react';

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

const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';

const TempoDApp = () => {
  const [account, setAccount] = useState(null);
  const [nativeBalance, setNativeBalance] = useState('0');
  const [stablecoinBalances, setStablecoinBalances] = useState({
    AlphaUSD: '0',
    BetaUSD: '0',
    ThetaUSD: '0'
  });
  const [telegramChatId, setTelegramChatId] = useState('');
  const [savedChatId, setSavedChatId] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('AlphaUSD');
  const [memo, setMemo] = useState('');
  const [txStatus, setTxStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  useEffect(() => {
    if (account) {
      loadChatIdFromStorage();
      getAllBalances();
    }
  }, [account]);

  const loadChatIdFromStorage = () => {
    try {
      const stored = localStorage.getItem(`tempo_telegram_${account}`);
      if (stored) {
        setSavedChatId(stored);
      }
    } catch (error) {
      console.error('Error loading chat ID:', error);
    }
  };

  const sendTelegramMessage = async (chatId, message) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return false;
    }
  };

  const testTelegramConnection = async () => {
    if (!telegramChatId) {
      setTxStatus('Please enter your Telegram Chat ID');
      return;
    }

    setTestingTelegram(true);
    setTxStatus('Testing Telegram connection...');

    const testMessage = `🔔 <b>Tempo Wallet - Test Connection</b>\n\n` +
      `✅ Successfully connected!\n` +
      `📱 Wallet: <code>${account?.substring(0, 6)}...${account?.substring(38)}</code>\n\n` +
      `You will receive notifications for all transactions.`;

    const success = await sendTelegramMessage(telegramChatId, testMessage);

    if (success) {
      setTxStatus('✅ Test message sent! Check your Telegram');
      setTimeout(() => setTxStatus(''), 5000);
    } else {
      setTxStatus('❌ Failed to send message. Please check your Chat ID and Bot Token');
      setTimeout(() => setTxStatus(''), 5000);
    }

    setTestingTelegram(false);
  };

  const saveTelegramChatId = () => {
    if (telegramChatId && account) {
      try {
        localStorage.setItem(`tempo_telegram_${account}`, telegramChatId);
        setSavedChatId(telegramChatId);
        setTelegramChatId('');
        setShowProfile(false);
        setTxStatus('Telegram linked successfully! 🎉');
        setTimeout(() => setTxStatus(''), 3000);
      } catch (error) {
        console.error('Error saving chat ID:', error);
        setTxStatus('Failed to save Telegram Chat ID');
      }
    }
  };

  const connectWallet = async () => {
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
      } catch (error) {
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

  const getNativeBalance = async () => {
    if (window.ethereum && account) {
      try {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [account, 'latest']
        });
        const balanceInEth = parseInt(balance, 16) / 1e18;
        setNativeBalance(balanceInEth.toFixed(4));
      } catch (error) {
        console.error('Error getting native balance:', error);
      }
    }
  };

  const getStablecoinBalance = async (tokenKey) => {
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
    } catch (error) {
      console.error(`Error getting ${tokenKey} balance:`, error);
      return '0.00';
    }
  };

  const getAllBalances = async () => {
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
    } catch (error) {
      console.error('Error getting balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendPayment = async () => {
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
      
      if (savedChatId) {
        const explorerUrl = `https://explorer.testnet.tempo.xyz/tx/${txHash}`;
        
        let telegramMessage = `💸 <b>Payment Sent Successfully!</b>\n\n`;
        telegramMessage += `💰 Amount: <b>${amount} ${token.symbol}</b>\n`;
        telegramMessage += `📤 To: <code>${recipient.substring(0, 6)}...${recipient.substring(38)}</code>\n`;
        telegramMessage += `📋 Token: ${token.name}\n`;
        
        if (memo) {
          telegramMessage += `📝 Memo: ${memo}\n`;
        }
        
        telegramMessage += `\n🔗 <a href="${explorerUrl}">View on Explorer</a>\n`;
        telegramMessage += `⏰ ${new Date().toLocaleString()}`;

        const sent = await sendTelegramMessage(savedChatId, telegramMessage);
        
        if (sent) {
          setTxStatus(`✅ Transaction sent! Notification delivered to Telegram`);
        } else {
          setTxStatus(`⚠️ Transaction sent but failed to send Telegram notification`);
        }
      }
      
      setRecipient('');
      setAmount('');
      setMemo('');
      
      setTimeout(() => getAllBalances(), 3000);
      
    } catch (error) {
      console.error('Error sending transaction:', error);
      setTxStatus('Transaction failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setNativeBalance('0');
    setStablecoinBalances({
      AlphaUSD: '0',
      BetaUSD: '0',
      ThetaUSD: '0'
    });
    setSavedChatId('');
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
              <li>2. Add Tempo Testnet manually:
                <div className="mt-2 ml-4 p-2 bg-white rounded border text-xs font-mono">
                  <div>Network: Tempo Testnet</div>
                  <div>RPC: https://rpc.testnet.tempo.xyz</div>
                  <div>Chain ID: 42429</div>
                  <div>Symbol: USD</div>
                  <div>Explorer: https://explorer.testnet.tempo.xyz</div>
                </div>
              </li>
              <li>3. Switch to Tempo Testnet</li>
              <li>4. Click Connect MetaMask above</li>
              <li>5. Get testnet tokens from: <a href="https://docs.tempo.xyz/quickstart/faucet" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Tempo Faucet</a></li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Tempo Wallet</h1>
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
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800">Stablecoin Balances</h3>
              {(stablecoinBalances.AlphaUSD === '0.00' && 
                stablecoinBalances.BetaUSD === '0.00' && 
                stablecoinBalances.ThetaUSD === '0.00') && (
                <div className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                  No stablecoins - Get from faucet above
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
              <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Telegram Notifications
              </div>
              <div className="flex items-center gap-2 mt-2">
                {savedChatId ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-semibold">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-semibold">Not connected</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
              >
                <Settings className="w-4 h-4" />
                {savedChatId ? 'Update Settings' : 'Setup Telegram'}
              </button>
            </div>
          </div>
        </div>

        {showProfile && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              Telegram Notification Settings
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h3>
              <ol className="text-sm text-blue-800 space-y-2">
                <li><strong>1.</strong> Open Telegram and find bot: <code className="bg-white px-2 py-1 rounded">@userinfobot</code></li>
                <li><strong>2.</strong> Send command <code className="bg-white px-2 py-1 rounded">/start</code> to the bot</li>
                <li><strong>3.</strong> Bot will return your Chat ID (number like: 123456789)</li>
                <li><strong>4.</strong> Copy Chat ID and paste below</li>
                <li><strong>5.</strong> Create your own bot at <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">@BotFather</a></li>
                <li><strong>6.</strong> Get Bot Token and replace in code (line: TELEGRAM_BOT_TOKEN)</li>
              </ol>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telegram Chat ID
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Enter your Chat ID (e.g., 123456789)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get Chat ID from @userinfobot on Telegram
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={testTelegramConnection}
                  disabled={testingTelegram || !telegramChatId}
                  className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  {testingTelegram ? 'Testing...' : 'Test Connection'}
                </button>
                
                <button
                  onClick={saveTelegramChatId}
                  disabled={!telegramChatId}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Save Settings
                </button>
              </div>
            </div>
            
            {savedChatId && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  Currently linked to Chat ID: <code className="font-mono font-semibold">{savedChatId}</code>
                </p>
              </div>
            )}
          </div>
        )}

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
                onChange={(e) => setSelectedToken(e.target.value)}
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
                Message (Memo)
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Payment for services..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">Memo will be included in Telegram notification</p>
            </div>
            
            {!savedChatId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Telegram notifications are not set up. Click Setup Telegram above to receive transaction notifications.
                </p>
              </div>
            )}
            
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
              txStatus.includes('success') || txStatus.includes('Successfully') || txStatus.includes('sent')
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
    </div>
  );
};

export default TempoDApp;