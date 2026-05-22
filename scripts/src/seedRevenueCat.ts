import { getUncachableRevenueCatClient } from "./revenueCatClient.js";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
  Duration,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "Crypto Empire Tycoon";

const APP_STORE_APP_NAME = "Crypto Empire Tycoon iOS";
const APP_STORE_BUNDLE_ID = "com.cryptoempire.tycoon";
const PLAY_STORE_APP_NAME = "Crypto Empire Tycoon Android";
const PLAY_STORE_PACKAGE_NAME = "com.cryptoempire.tycoon";

const ENTITLEMENT_IDENTIFIER = "premium";
const ENTITLEMENT_DISPLAY_NAME = "Premium Access";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

interface ProductDef {
  id: string;
  playStoreId: string;
  displayName: string;
  title: string;
  duration: Duration;
  prices: { amount_micros: number; currency: string }[];
  packageKey: string;
  packageName: string;
}

const PRODUCTS: ProductDef[] = [
  {
    id: "vip_weekly",
    playStoreId: "vip_weekly:weekly",
    displayName: "VIP 7 Days",
    title: "VIP Membership — 7 Days",
    duration: "P1W",
    prices: [{ amount_micros: 2990000, currency: "USD" }],
    packageKey: "$rc_weekly",
    packageName: "VIP Weekly",
  },
  {
    id: "vip_monthly",
    playStoreId: "vip_monthly:monthly",
    displayName: "VIP 30 Days",
    title: "VIP Membership — 30 Days",
    duration: "P1M",
    prices: [{ amount_micros: 9990000, currency: "USD" }],
    packageKey: "$rc_monthly",
    packageName: "VIP Monthly",
  },
  {
    id: "vip_annual",
    playStoreId: "vip_annual:annual",
    displayName: "VIP 1 Year",
    title: "VIP Membership — 1 Year",
    duration: "P1Y",
    prices: [{ amount_micros: 49990000, currency: "USD" }],
    packageKey: "$rc_annual",
    packageName: "VIP Annual",
  },
  {
    id: "starter_pack",
    playStoreId: "starter_pack:lifetime",
    displayName: "Starter Pack",
    title: "Starter Pack — $10K + 0.5 BTC",
    duration: "P1W",
    prices: [{ amount_micros: 1990000, currency: "USD" }],
    packageKey: "starter_pack",
    packageName: "Starter Pack",
  },
  {
    id: "miners_kit",
    playStoreId: "miners_kit:lifetime",
    displayName: "Miner's Kit",
    title: "Miner's Kit — $50K + 2 BTC + Boost",
    duration: "P1W",
    prices: [{ amount_micros: 4990000, currency: "USD" }],
    packageKey: "miners_kit",
    packageName: "Miner's Kit",
  },
  {
    id: "crypto_bundle",
    playStoreId: "crypto_bundle:lifetime",
    displayName: "Crypto Bundle",
    title: "Crypto Bundle — $500K + 10 BTC",
    duration: "P1W",
    prices: [{ amount_micros: 14990000, currency: "USD" }],
    packageKey: "crypto_bundle",
    packageName: "Crypto Bundle",
  },
  {
    id: "empire_pack",
    playStoreId: "empire_pack:lifetime",
    displayName: "Empire Pack",
    title: "Empire Pack — $5M + 100 BTC",
    duration: "P1W",
    prices: [{ amount_micros: 49990000, currency: "USD" }],
    packageKey: "empire_pack",
    packageName: "Empire Pack",
  },
  {
    id: "double_income",
    playStoreId: "double_income:lifetime",
    displayName: "2x Income Forever",
    title: "2× Income — Permanent Upgrade",
    duration: "P1W",
    prices: [{ amount_micros: 4990000, currency: "USD" }],
    packageKey: "double_income",
    packageName: "2× Income Forever",
  },
  {
    id: "fast_mining",
    playStoreId: "fast_mining:lifetime",
    displayName: "1.5x Mining Speed",
    title: "1.5× Mining Speed — Permanent",
    duration: "P1W",
    prices: [{ amount_micros: 2990000, currency: "USD" }],
    packageKey: "fast_mining",
    packageName: "1.5× Mining Speed",
  },
  {
    id: "offline_2x",
    playStoreId: "offline_2x:lifetime",
    displayName: "2x Offline Earnings",
    title: "2× Offline Earnings — Permanent",
    duration: "P1W",
    prices: [{ amount_micros: 3990000, currency: "USD" }],
    packageKey: "offline_2x",
    packageName: "2× Offline Earnings",
  },
];

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ── Project ──────────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } =
    await listProjects({ client, query: { limit: 20 } });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find(
    (p) => p.name === PROJECT_NAME,
  );
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({
      client,
      body: { name: PROJECT_NAME },
    });
    if (error) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // ── Apps ─────────────────────────────────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0)
    throw new Error("No apps found");

  let testStoreApp: App | undefined = apps.items.find(
    (a) => a.type === "test_store",
  );
  let appStoreApp: App | undefined = apps.items.find(
    (a) => a.type === "app_store",
  );
  let playStoreApp: App | undefined = apps.items.find(
    (a) => a.type === "play_store",
  );

  if (!testStoreApp) throw new Error("No test store app found");
  console.log("Test Store app:", testStoreApp.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: {
        name: APP_STORE_APP_NAME,
        type: "app_store",
        app_store: { bundle_id: APP_STORE_BUNDLE_ID },
      },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app found:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: {
        name: PLAY_STORE_APP_NAME,
        type: "play_store",
        play_store: { package_name: PLAY_STORE_PACKAGE_NAME },
      },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app found:", playStoreApp.id);
  }

  // ── Products ─────────────────────────────────────────────────────────────
  const { data: existingProducts, error: listProductsError } =
    await listProducts({
      client,
      path: { project_id: project.id },
      query: { limit: 100 },
    });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (
    targetApp: App,
    label: string,
    storeId: string,
    isTestStore: boolean,
    def: ProductDef,
  ): Promise<Product> => {
    const existing = existingProducts.items?.find(
      (p) => p.store_identifier === storeId && p.app_id === targetApp.id,
    );
    if (existing) {
      console.log(`${label} product already exists: ${existing.id}`);
      return existing;
    }
    const body: CreateProductData["body"] = {
      store_identifier: storeId,
      app_id: targetApp.id,
      type: "subscription",
      display_name: def.displayName,
    };
    if (isTestStore) {
      body.subscription = { duration: def.duration };
      body.title = def.title;
    }
    const { data: created, error } = await createProduct({
      client,
      path: { project_id: project.id },
      body,
    });
    if (error) throw new Error(`Failed to create ${label} product: ${JSON.stringify(error)}`);
    console.log(`Created ${label} product: ${created.id}`);
    return created;
  };

  const productMap: Record<
    string,
    { test: Product; ios: Product; android: Product }
  > = {};

  for (const def of PRODUCTS) {
    const test = await ensureProduct(
      testStoreApp,
      `TestStore(${def.id})`,
      def.id,
      true,
      def,
    );
    const ios = await ensureProduct(
      appStoreApp,
      `AppStore(${def.id})`,
      def.id,
      false,
      def,
    );
    const android = await ensureProduct(
      playStoreApp,
      `PlayStore(${def.id})`,
      def.playStoreId,
      false,
      def,
    );
    productMap[def.id] = { test, ios, android };

    // Set test store prices
    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: test.id },
      body: { prices: def.prices },
    });
    if (priceError) {
      if (
        typeof priceError === "object" &&
        "type" in priceError &&
        priceError["type"] === "resource_already_exists"
      ) {
        console.log(`Prices already exist for ${def.id}`);
      } else {
        console.warn(`Failed to set prices for ${def.id}:`, priceError);
      }
    } else {
      console.log(`Set test store prices for ${def.id}`);
    }
  }

  // ── Entitlement ───────────────────────────────────────────────────────────
  let entitlement: Entitlement | undefined;
  const { data: existingEntitlements, error: listEntitlementsError } =
    await listEntitlements({
      client,
      path: { project_id: project.id },
      query: { limit: 20 },
    });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const existingEntitlement = existingEntitlements.items?.find(
    (e) => e.lookup_key === ENTITLEMENT_IDENTIFIER,
  );
  if (existingEntitlement) {
    console.log("Entitlement already exists:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data: newEnt, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: {
        lookup_key: ENTITLEMENT_IDENTIFIER,
        display_name: ENTITLEMENT_DISPLAY_NAME,
      },
    });
    if (error) throw new Error("Failed to create entitlement");
    console.log("Created entitlement:", newEnt.id);
    entitlement = newEnt;
  }

  // Attach VIP products to entitlement (the ones that grant VIP)
  const vipProductIds = ["vip_weekly", "vip_monthly", "vip_annual"].flatMap(
    (id) => [
      productMap[id].test.id,
      productMap[id].ios.id,
      productMap[id].android.id,
    ],
  );
  const { error: attachEntErr } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: vipProductIds },
  });
  if (attachEntErr) {
    if (attachEntErr.type === "unprocessable_entity_error") {
      console.log("Products already attached to entitlement");
    } else {
      throw new Error("Failed to attach products to entitlement");
    }
  } else {
    console.log("Attached VIP products to entitlement");
  }

  // ── Offering ──────────────────────────────────────────────────────────────
  let offering: Offering | undefined;
  const { data: existingOfferings, error: listOfferingsError } =
    await listOfferings({
      client,
      path: { project_id: project.id },
      query: { limit: 20 },
    });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOffering = existingOfferings.items?.find(
    (o) => o.lookup_key === OFFERING_IDENTIFIER,
  );
  if (existingOffering) {
    console.log("Offering already exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOff, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: {
        lookup_key: OFFERING_IDENTIFIER,
        display_name: OFFERING_DISPLAY_NAME,
      },
    });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", newOff.id);
    offering = newOff;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  // ── Packages ──────────────────────────────────────────────────────────────
  const { data: existingPackages, error: listPackagesError } =
    await listPackages({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      query: { limit: 50 },
    });
  if (listPackagesError) throw new Error("Failed to list packages");

  for (const def of PRODUCTS) {
    const existingPkg = existingPackages.items?.find(
      (p) => p.lookup_key === def.packageKey,
    );
    let pkg: Package;
    if (existingPkg) {
      console.log(`Package already exists: ${def.packageKey}`);
      pkg = existingPkg;
    } else {
      const { data: newPkg, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: offering.id },
        body: {
          lookup_key: def.packageKey,
          display_name: def.packageName,
        },
      });
      if (error)
        throw new Error(`Failed to create package ${def.packageKey}: ${JSON.stringify(error)}`);
      console.log(`Created package: ${def.packageKey}`);
      pkg = newPkg;
    }

    const prods = productMap[def.id];
    const { error: attachPkgErr } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: prods.test.id, eligibility_criteria: "all" },
          { product_id: prods.ios.id, eligibility_criteria: "all" },
          { product_id: prods.android.id, eligibility_criteria: "all" },
        ],
      },
    });
    if (attachPkgErr) {
      if (
        attachPkgErr.type === "unprocessable_entity_error" &&
        attachPkgErr.message?.includes("Cannot attach product")
      ) {
        console.log(`Skipping attach for ${def.packageKey}: already attached`);
      } else {
        console.warn(`Failed to attach products to package ${def.packageKey}:`, attachPkgErr);
      }
    } else {
      console.log(`Attached products to package: ${def.packageKey}`);
    }
  }

  // ── API Keys ──────────────────────────────────────────────────────────────
  const { data: testKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: testStoreApp.id },
  });
  const { data: iosKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: appStoreApp.id },
  });
  const { data: androidKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: playStoreApp.id },
  });

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", testStoreApp.id);
  console.log("App Store App ID:", appStoreApp.id);
  console.log("Play Store App ID:", playStoreApp.id);
  console.log("Entitlement:", ENTITLEMENT_IDENTIFIER);
  console.log(
    "EXPO_PUBLIC_REVENUECAT_TEST_API_KEY:",
    testKeys?.items.map((k) => k.key).join(", ") ?? "N/A",
  );
  console.log(
    "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY:",
    iosKeys?.items.map((k) => k.key).join(", ") ?? "N/A",
  );
  console.log(
    "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY:",
    androidKeys?.items.map((k) => k.key).join(", ") ?? "N/A",
  );
  console.log("REVENUECAT_PROJECT_ID:", project.id);
  console.log("REVENUECAT_TEST_STORE_APP_ID:", testStoreApp.id);
  console.log("REVENUECAT_APPLE_APP_STORE_APP_ID:", appStoreApp.id);
  console.log("REVENUECAT_GOOGLE_PLAY_STORE_APP_ID:", playStoreApp.id);
  console.log("====================\n");
}

seedRevenueCat().catch(console.error);
