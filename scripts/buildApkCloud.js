const fs = require('fs');
const path = require('path');

async function buildApk() {
  const iconUrl = "https://files.catbox.moe/9jukal.png";
  const manifestUrl = "https://files.catbox.moe/9t0gk3.json";

  const options = {
    additionalTrustedOrigins: [],
    appVersion: "1.0.0.0",
    appVersionCode: 1,
    backgroundColor: "#04153B",
    display: "standalone",
    enableSiteSettingsShortcut: true,
    enableNotifications: false,
    includeSourceCode: false,
    fallbackType: "customtabs",
    features: {
      locationDelegation: { enabled: true },
      playBilling: { enabled: false }
    },
    host: "https://files.catbox.moe",
    iconUrl: iconUrl,
    launcherName: "AC",
    name: "AC",
    maskableIconUrl: iconUrl,
    navigationColor: "#04153B",
    navigationColorDark: "#04153B",
    navigationDividerColor: "#04153B",
    navigationDividerColorDark: "#04153B",
    orientation: "portrait",
    packageId: "com.amoztech.ac",
    pwaUrl: "https://files.catbox.moe",
    signingMode: "new",
    signing: {
      file: null,
      alias: "ac-key",
      fullName: "Amos",
      organization: "AmozTech",
      organizationalUnit: "Engineering",
      countryCode: "GH",
      keyPassword: "AmosPassword2026!",
      storePassword: "AmosPassword2026!"
    },
    splashScreenFadeOutDuration: 300,
    startUrl: "https://files.catbox.moe/",
    themeColor: "#04153B",
    themeColorDark: "#04153B",
    webManifestUrl: manifestUrl
  };

  console.log('Sending enqueue request to CloudAPK with valid public manifest...');
  const res = await fetch("https://pwabuilder-cloudapk.azurewebsites.net/enqueuePackageJob", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "platform-identifier": "ServerUI",
      "platform-identifier-version": "1.0.0"
    },
    body: JSON.stringify(options)
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to enqueue job: ${res.status} ${res.statusText}`, text);
    return;
  }

  const { id: jobId, accessToken } = await res.json();
  console.log(`Job enqueued successfully! ID: ${jobId}. Polling for completion...`);

  let completed = false;
  let attempts = 0;

  while (!completed && attempts < 90) {
    await new Promise((r) => setTimeout(r, 4000));
    attempts++;

    const pollRes = await fetch(`https://pwabuilder-cloudapk.azurewebsites.net/getPackageJob?id=${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!pollRes.ok) {
      console.log(`Poll attempt ${attempts} status: ${pollRes.status}`);
      continue;
    }

    const job = await pollRes.json();
    console.log(`[${attempts}] Job status: ${job.status}`);

    if (job.status === "Completed") {
      completed = true;
      console.log('Job completed! Downloading package ZIP...');

      const zipRes = await fetch(`https://pwabuilder-cloudapk.azurewebsites.net/downloadPackageZip?id=${encodeURIComponent(jobId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!zipRes.ok) {
        console.error('Failed to download zip:', zipRes.statusText);
        return;
      }

      const zipBuffer = Buffer.from(await zipRes.arrayBuffer());
      const zipPath = path.join(__dirname, '..', 'ac-android-package.zip');
      fs.writeFileSync(zipPath, zipBuffer);
      console.log(`Saved package ZIP (${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB) to:`, zipPath);
      return zipPath;
    } else if (job.status === "Failed") {
      console.error('Job failed. Logs:', job.logs);
      return;
    }
  }
}

buildApk().catch(console.error);
