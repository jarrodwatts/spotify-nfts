import { getSession } from "next-auth/react";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";

export default async function generateNftSignature(req, res) {
  const session = await getSession({ req });

  // Grab the claimer address (currently connected address) out of the request body
  const { claimerAddress } = JSON.parse(req.body);

  // Read the access token from the session so we can use it in the below API request
  const accessToken = session?.accessToken;

  const response = await fetch(
    `https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  // Parse the response as JSON
  const data = await response.json();

  // Take 0th item's href and fetch that

  const trackResponse = await fetch(data.items[0].href, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const trackData = await trackResponse.json();

  console.log(trackData);

  // You'll need to add your private key in a .env.local file in the root of your project
  // !!!!! NOTE !!!!! NEVER LEAK YOUR PRIVATE KEY to anyone!
  // This allows us (the contract owner) to control the generation of the mint signatures
  if (!process.env.PRIVATE_KEY) {
    throw new Error("You're missing PRIVATE_KEY in your .env.local file.");
  }

  // Initialize the Thirdweb SDK on the serverside using the private key on the mumbai network
  const sdk = ThirdwebSDK.fromPrivateKey(process.env.PRIVATE_KEY, "mumbai");

  // Load the NFT Collection via it's contract address using the SDK
  const nftCollection = sdk.getNFTCollection(
    "0x79f096f1fE932dfe746Fc6f79c42bBF38212e214"
  );

  // Generate the signature for the NFT mint transaction
  const signedPayload = await nftCollection.signature.generate({
    to: claimerAddress,
    metadata: {
      name: `Top Song: ${trackData.name} by ${trackData.artists[0].name}`,
      image: `${trackData.album.images[0].url}`,
      description: `An NFT awarded for having this track as your most listened track of all time on Spotify.`,
    },
  });

  // Return back the signedPayload (mint signature) to the client.
  res.status(200).json({
    signedPayload: JSON.parse(JSON.stringify(signedPayload)),
  });
}
