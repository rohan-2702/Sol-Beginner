// Import functionalities
import './App.css';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { useEffect, useState } from "react";

// Import to fix polyfill issue with buffer with webpack
import * as buffer from "buffer";
window.Buffer = buffer.Buffer;

// Create types
type DisplayEncoding = "utf8" | "hex";
type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

// Create a provider interface to store the Phantom Provider
interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

// Get Phantom provider if it exists
const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

export default function App() {
  const [provider, setProvider] = useState<PhantomProvider | undefined>(undefined);
  const [receiverPublicKey, setReceiverPublicKey] = useState<PublicKey | undefined>(undefined);
  const [senderKeypair, setSenderKeypair] = useState<Keypair | undefined>(undefined);
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  useEffect(() => {
    const provider = getProvider();
    if (provider) setProvider(provider);
    else setProvider(undefined);
  }, []);

  const createSender = async () => {
    const keypair = Keypair.generate();
    setSenderKeypair(keypair);
    console.log('Sender account: ', keypair.publicKey.toString());
    console.log('Airdropping 2 SOL to Sender Wallet');

    const airdropSignature = await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL * 2);
    await connection.confirmTransaction(airdropSignature);

    console.log('Wallet Balance: ' + (await connection.getBalance(keypair.publicKey)) / LAMPORTS_PER_SOL);
  };

  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;
    if (solana) {
      try {
        const response = await solana.connect();
        console.log('Connected to Phantom Wallet:', response.publicKey.toString());
        setReceiverPublicKey(response.publicKey);
      } catch (err) {
        console.log(err);
      }
    }
  };

  const disconnectWallet = async () => {
    // @ts-ignore
    const { solana } = window;
    if (solana) {
      try {
        await solana.disconnect();
        setReceiverPublicKey(undefined);
        console.log("Wallet disconnected");
      } catch (err) {
        console.log(err);
      }
    }
  };

  const transferSol = async () => {
    if (senderKeypair && receiverPublicKey) {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: receiverPublicKey,
          lamports: LAMPORTS_PER_SOL, // 1 SOL
        })
      );

      const signature = await sendAndConfirmTransaction(connection, transaction, [senderKeypair]);
      console.log("Transaction sent and confirmed");
      console.log("Sender Balance: " + await connection.getBalance(senderKeypair.publicKey) / LAMPORTS_PER_SOL);
      console.log("Receiver Balance: " + await connection.getBalance(receiverPublicKey) / LAMPORTS_PER_SOL);
    } else {
      alert('Please create an account and connect to Phantom Wallet first.');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>Solana Transfer</h2>
        <span className="buttons">
          <button
            className="action-button"
            onClick={createSender}
          >
            Create a New Solana Account
          </button>
          {provider && !receiverPublicKey && (
            <button
              className="action-button"
              onClick={connectWallet}
            >
              Connect to Phantom Wallet
            </button>
          )}
          {provider && receiverPublicKey && (
            <div>
              <button
                className="action-button disconnect-button"
                onClick={disconnectWallet}
              >
                Disconnect from Wallet
              </button>
            </div>
          )}
          {provider && receiverPublicKey && senderKeypair && (
            <button
              className="action-button"
              onClick={transferSol}
            >
              Transfer SOL to Phantom Wallet
            </button>
          )}
        </span>
        {!provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}
      </header>
    </div>
  );
}
