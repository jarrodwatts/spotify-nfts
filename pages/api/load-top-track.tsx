import { getSession } from "next-auth/react";

export default async function loadTopArtists(req, res) {
  const session = await getSession({ req });

  // Read the access token from the session so we can use it in the below API request
  const accessToken = session?.accessToken;

  console.log(accessToken);

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

  // Return back the signedPayload (mint signature) to the client.
  res.status(200).json({
    data: JSON.parse(JSON.stringify(trackData)),
  });
}
