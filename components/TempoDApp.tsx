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
  const [memoPrefix] = useState<string>('INV123456'); // Prefix cố định
  const [txStatus, setTxStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (account) {
      getAllBalances();
    }
  }, [account]);

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
      let transferData = '0xa9059cbb' + recipientPadded + amountHex;
      
      // Append memo to transaction data if provided
      // Combine prefix with user memo
      const fullMemo = memo && memo.trim() 
        ? `${memoPrefix} (${memo.trim()})` 
        : memoPrefix;
      
      if (fullMemo) {
        // Convert memo to hex (UTF-8 encoding)
        const memoBytes = new TextEncoder().encode(fullMemo);
        const memoHex = Array.from(memoBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        // Append memo to transaction data
        transferData += memoHex;
        console.log('📝 Full memo added to transaction:', fullMemo);
      }
      
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
      
      const fullMemo = memo && memo.trim() 
        ? `${memoPrefix} (${memo.trim()})` 
        : memoPrefix;
      
      setTxStatus(`✅ Payment sent with memo: ${fullMemo} | TX: ${txHash.substring(0, 10)}...`);
      
      // Clear form
      setRecipient('');
      setAmount('');
      setMemo('');
      
      // Refresh balances
      setTimeout(() => getAllBalances(), 3000);
      
    } catch (error: any) {
      console.error('Transaction error:', error);
      setTxStatus('❌ Transaction failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = (): void => {
    setAccount(null);
    setNativeBalance('0');
    setStablecoinBalances({ AlphaUSD: '0', BetaUSD: '0', ThetaUSD: '0' });
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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Tempo Wallet</h1>
            <p className="text-gray-600 mb-2">Secure stablecoin payments on Tempo testnet</p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">Tempo Testnet</span>
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
              <li>• Send stablecoin payments on Tempo</li>
              <li>• Support for AlphaUSD, BetaUSD, ThetaUSD</li>
              <li>• Fast and secure transactions</li>
              <li>• Add memo notes to payments</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Network Status Banner */}
        <div className="mb-4 bg-white rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">Tempo Testnet</span>
            </div>
          </div>
          <button
            onClick={disconnectWallet}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>

        <div className="space-y-6">
          {/* Wallet Info */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Tempo Wallet</h1>
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
                  Payment Memo
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    <span className="font-mono text-sm text-gray-700 font-semibold">{memoPrefix}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-xs text-gray-500">Invoice prefix (fixed)</span>
                  </div>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="Add custom note (optional)..."
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700">
                      <span className="font-semibold">Preview:</span> {memo && memo.trim() ? `${memoPrefix} (${memo.trim()})` : memoPrefix}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      💡 This memo will be stored onchain and visible on block explorer
                    </p>
                  </div>
                </div>
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
      </div>
    </div>
  );
};

export default TempoDApp;