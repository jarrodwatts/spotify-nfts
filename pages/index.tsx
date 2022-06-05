import {
  useAddress,
  useNFTCollection,
  useNetwork,
  useNetworkMismatch,
} from "@thirdweb-dev/react";
import { ChainId } from "@thirdweb-dev/react";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import SignIn from "../components/SignIn";
import styles from "../styles/Theme.module.css";

export default function Home() {
  // Grab the currently connected wallet's address
  const address = useAddress();

  // Get the currently authenticated user's session (Next Auth + Spotify)
  const { data: session } = useSession();

  // Hooks to enforce the user is on the correct network (Mumbai as declared in _app.js) before minting
  const isOnWrongNetwork = useNetworkMismatch();
  const [, switchNetwork] = useNetwork();

  // Get the NFT Collection we deployed using thirdweb+
  const nftCollectionContract = useNFTCollection(
    "0x79f096f1fE932dfe746Fc6f79c42bBF38212e214"
  );

  const [data, setData] = useState(null);
  const [isLoading, setLoading] = useState(false);
  useEffect(() => {
    if (session) {
      setLoading(true);
      // Load the check to see if the user  and store it in state
      fetch("api/load-top-track")
        .then((res) => res.json())
        .then((d) => {
          setData(d.data || undefined);
          setLoading(false);
        });
    }
  }, [session]);

  // Function to create a signature on the server-side, and use the signature to mint the NFT
  async function mintNft() {
    // Ensure wallet connected
    if (!address) {
      alert("Please connect your wallet to continue.");
      return;
    }

    // Ensure correct network
    if (isOnWrongNetwork) {
      switchNetwork(ChainId.Mumbai);
      return;
    }

    // Make a request to the API route to generate a signature for us to mint the NFT with
    const signature = await fetch(`/api/generate-signature`, {
      method: "POST",
      body: JSON.stringify({
        // Pass our wallet address (currently connected wallet) as the parameter
        claimerAddress: address,
      }),
    });

    // If the user meets the criteria to have a signature generated, we can use the signature
    // on the client side to mint the NFT from this client's wallet
    if (signature.status === 200) {
      const json = await signature.json();
      const signedPayload = json.signedPayload;
      const nft = await nftCollectionContract?.signature.mint(signedPayload);

      // Show a link to view the NFT they minted
      alert(
        `Success 🔥 Check out your NFT here: https://testnets.opensea.io/assets/mumbai/0x79f096f1fE932dfe746Fc6f79c42bBF38212e214/${nft.id.toNumber()}`
      );
    }
    // If the user does not meet the criteria to have a signature generated, we can show them an error
    else {
      alert("Something went wrong.");
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>thirdweb Community Rewards Example</h1>

      <p className={styles.explain}>
        An example project demonstrating how you can use{" "}
        <a
          href="https://thirdweb.com/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.purple}
        >
          thirdweb
        </a>
        &apos;s signature-based minting to reward your community.
      </p>

      <p className={styles.explain}>
        This demo converts your top spotify song into an NFT.
      </p>

      <hr className={styles.divider} />

      <SignIn />

      {address && session ? (
        isLoading ? (
          <p>Fetching data...</p>
        ) : data ? (
          <div className={`${styles.main} ${styles.spacerTop}`}>
            <h3>Hey {session?.user?.name} 👋</h3>
            <p>Here is your top track of all time:</p>

            <h3>
              <b>{data?.name}</b> by <b>{data?.artists[0].name}</b>
            </h3>

            <img
              src={data?.album.images[0].url}
              style={{
                maxWidth: "85%",
                borderRadius: 16,
              }}
            />

            <button
              className={`${styles.mainButton} ${styles.bigSpacerTop}`}
              onClick={mintNft}
            >
              Mint NFT
            </button>
          </div>
        ) : (
          <div className={`${styles.main} ${styles.spacerTop}`}>
            <p>Something went wrong checking your Spotify data.</p>
          </div>
        )
      ) : null}
    </div>
  );
}
