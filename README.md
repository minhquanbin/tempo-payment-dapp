# Tempo + XMTP v3 Payment DApp

A decentralized payment application that combines **Tempo testnet** for on-chain payments with **XMTP v3** for encrypted messaging and payment notifications.

## 🌟 Features

- ✅ **Tempo Testnet Payments**: Send stablecoins (AlphaUSD, BetaUSD, ThetaUSD) on Tempo
- ✅ **XMTP v3 Messaging**: Encrypted end-to-end messaging with MLS standard
- ✅ **Payment Notifications**: Auto-send payment receipts via XMTP
- ✅ **Real-time Chat**: Full chat interface for XMTP conversations
- ✅ **Multi-token Support**: Support for 3 different stablecoins
- ✅ **Recipient Detection**: Check if recipient is on XMTP before sending

## 🏗️ Architecture

### Tempo Testnet
- **Network**: Custom EVM-compatible testnet
- **Stablecoins**: 3 native stablecoins with 6 decimals
- **Gas Token**: TEMO (native token)

### XMTP v3
- **Environment**: `dev` (testnet)
- **Protocol**: MLS (Messaging Layer Security)
- **Network**: Decentralized messaging nodes
- **Encryption**: End-to-end encrypted
- **Storage**: Local-first with network sync

## 📦 Installation

### Prerequisites
- Node.js >= 18.0.0
- MetaMask or compatible Web3 wallet
- Access to Tempo testnet RPC

### Setup

1. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. **Required packages**
```bash
npm install @xmtp/xmtp-js@^12.1.0 ethers@^5.7.2 lucide-react
```

3. **Configure MetaMask for Tempo Testnet**

Add Tempo testnet to MetaMask:
- **Network Name**: Tempo Testnet
- **RPC URL**: [Your Tempo RPC URL]
- **Chain ID**: [Your Chain ID]
- **Currency Symbol**: TEMO
- **Block Explorer**: [Your Explorer URL]

## 🚀 Usage

### 1. Connect Wallet
- Click "Connect MetaMask"
- Approve the connection request
- XMTP v3 will automatically initialize

### 2. Check Balances
- View your stablecoin balances (AlphaUSD, BetaUSD, ThetaUSD)
- View native TEMO balance
- Click "Refresh" to update

### 3. Send Payment
- Select token (AlphaUSD/BetaUSD/ThetaUSD)
- Enter recipient address (0x...)
- Enter amount
- (Optional) Add message for XMTP notification
- Click "Send Payment"

### 4. XMTP Features
- **Automatic Detection**: App checks if recipient is on XMTP v3
- **Payment Notification**: If recipient has XMTP, they receive encrypted notification
- **Chat Interface**: View and manage all XMTP conversations
- **Real-time Messaging**: Send/receive messages in real-time

## 🔧 Technical Details

### XMTP v3 Integration

```typescript
// Initialize XMTP v3 client
const { Client } = await import('@xmtp/xmtp-js');
const client = await Client.create(signer, {
  env: 'dev' // Use 'dev' for testnet
});

// Check if address can receive messages
const canMessage = await client.canMessage([recipientAddress]);

// Create conversation and send message
const conversation = await client.conversations.newConversation(recipientAddress);
await conversation.send(messageContent);
```

### Smart Contract Interaction

```typescript
// ERC20 transfer
const transferData = '0xa9059cbb' + recipientPadded + amountHex;
const txHash = await window.ethereum.request({
  method: 'eth_sendTransaction',
  params: [{
    from: account,
    to: tokenAddress,
    data: transferData,
    value: '0x0'
  }]
});
```

## 📡 XMTP v3 Testnet Status

- **Launch Date**: February 6, 2025
- **Status**: Active testnet
- **Fees**: Currently free (unincentivized)
- **Mainnet ETA**: H2 2025 (March 2026)
- **SDK Version**: v12.x+ (stable v3)

### XMTP v3 Features
- ✅ End-to-end encryption (MLS standard)
- ✅ Group chats and DMs
- ✅ Decentralized node network
- ✅ Local-first architecture
- ✅ Cross-platform inbox
- ✅ Rich content types

## 🔐 Security

### XMTP Security
- **Encryption**: IETF MLS (Messaging Layer Security)
- **Keys**: Stored locally in encrypted database
- **Privacy**: Zero-knowledge messaging
- **Decentralization**: No single point of failure

### Smart Contract Security
- **Token Contracts**: Fixed addresses on Tempo testnet
- **Transfer Method**: Standard ERC20 `transfer()`
- **Validation**: Amount and address validation before sending

## 🐛 Troubleshooting

### XMTP Initialization Failed
**Problem**: "XMTP unavailable" error

**Solutions**:
1. Check internet connection
2. Try refreshing the page
3. Ensure MetaMask is unlocked
4. XMTP testnet might be temporarily down
5. Click "Try Again" button

### Recipient Not on XMTP
**Problem**: Recipient can't receive XMTP message

**Solution**: This is normal! Payment still works. The recipient needs to:
1. Use an app with XMTP integration
2. Initialize XMTP client with their wallet
3. Or they can receive payment without XMTP notification

### Transaction Failed
**Problem**: Tempo testnet transaction fails

**Solutions**:
1. Check you have enough TEMO for gas
2. Check you have enough token balance
3. Ensure correct recipient address
4. Check Tempo testnet is operational

## 📚 Resources

### XMTP
- [XMTP Documentation](https://docs.xmtp.org)
- [XMTP Testnet Launch](https://paragraph.xyz/@xmtp_community/xmtp-launches-testnet)
- [XMTP GitHub](https://github.com/xmtp)
- [XMTP v3 Upgrade Guide](https://docs.xmtp.org/upgrade-from-legacy-V2)

### Tempo
- [Tempo Testnet Documentation](https://docs.tempo.network)
- [Tempo Block Explorer](https://explorer.tempo.network)

## 🎯 Roadmap

### Current (v1.0)
- ✅ Tempo testnet payments
- ✅ XMTP v3 testnet integration
- ✅ Payment notifications
- ✅ Basic chat interface

### Future (v2.0)
- 🔄 XMTP mainnet support (when available)
- 🔄 Group chat support
- 🔄 Rich content types (images, files)
- 🔄 Push notifications
- 🔄 Payment history tracking
- 🔄 Multi-chain support

## 📄 License

MIT License

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 💬 Support

- GitHub Issues: [Create Issue]
- XMTP Discord: https://discord.gg/xmtp
- Tempo Community: [Your Community Link]

## ⚠️ Disclaimer

This is a testnet application. Do not use with real funds. XMTP v3 is in active development and may have breaking changes.

---

Built with ❤️ using Tempo Testnet + XMTP v3