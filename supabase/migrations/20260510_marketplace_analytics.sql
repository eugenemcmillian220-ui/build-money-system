-- Migration: Replace in-memory marketplace and analytics storage with Supabase tables
-- Fixes DA-037 (replace in-memory storage) and DA-038 (database transactions)

-- Marketplace Listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  seller_id UUID NOT NULL,
  tags TEXT[] DEFAULT '{}',
  purchase_count INTEGER NOT NULL DEFAULT 0,
  rating FLOAT NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);

-- Marketplace Purchases
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_listing_id ON marketplace_purchases(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_buyer_id ON marketplace_purchases(buyer_id);

-- Marketplace Reviews
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_listing_id ON marketplace_reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_user_id ON marketplace_reviews(user_id);

-- Analytics Metrics
CREATE TABLE IF NOT EXISTS analytics_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  value FLOAT NOT NULL,
  unit VARCHAR(50),
  category VARCHAR(100),
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  ts BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_metrics_name ON analytics_metrics(name);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_category ON analytics_metrics(category);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_user_id ON analytics_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_ts ON analytics_metrics(ts);

-- RLS for marketplace_listings
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all listings"
  ON marketplace_listings FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS for marketplace_purchases
ALTER TABLE marketplace_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all purchases"
  ON marketplace_purchases FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS for marketplace_reviews
ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all reviews"
  ON marketplace_reviews FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS for analytics_metrics
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all metrics"
  ON analytics_metrics FOR ALL
  USING (true)
  WITH CHECK (true);

-- Atomic purchase function: inserts purchase, increments listing counter in one transaction
CREATE OR REPLACE FUNCTION purchase_listing_atomic(
  p_listing_id UUID,
  p_buyer_id UUID
)
RETURNS TABLE(purchase_id UUID, purchase_amount INTEGER) AS $$
DECLARE
  v_listing marketplace_listings%ROWTYPE;
  v_purchase_id UUID;
BEGIN
  -- Lock the listing row to prevent race conditions
  SELECT * INTO v_listing
  FROM marketplace_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing % not found', p_listing_id;
  END IF;

  IF v_listing.status != 'active' THEN
    RAISE EXCEPTION 'Listing % is not available', p_listing_id;
  END IF;

  -- Insert purchase
  INSERT INTO marketplace_purchases (listing_id, buyer_id, amount, status)
  VALUES (p_listing_id, p_buyer_id, v_listing.price, 'completed')
  RETURNING id INTO v_purchase_id;

  -- Increment purchase count
  UPDATE marketplace_listings
  SET purchase_count = purchase_count + 1,
      updated_at = NOW()
  WHERE id = p_listing_id;

  RETURN QUERY SELECT v_purchase_id, v_listing.price;
END;
$$ LANGUAGE plpgsql;

-- Atomic review function: inserts review, recalculates rating in one transaction
CREATE OR REPLACE FUNCTION add_review_atomic(
  p_listing_id UUID,
  p_user_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_review_id UUID;
  v_avg_rating FLOAT;
  v_count INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM marketplace_listings WHERE id = p_listing_id) THEN
    RAISE EXCEPTION 'Listing % not found', p_listing_id;
  END IF;

  -- Insert review
  INSERT INTO marketplace_reviews (listing_id, user_id, rating, comment)
  VALUES (p_listing_id, p_user_id, p_rating, p_comment)
  RETURNING id INTO v_review_id;

  -- Recalculate rating
  SELECT AVG(rating), COUNT(*) INTO v_avg_rating, v_count
  FROM marketplace_reviews
  WHERE listing_id = p_listing_id;

  UPDATE marketplace_listings
  SET rating = v_avg_rating,
      review_count = v_count,
      updated_at = NOW()
  WHERE id = p_listing_id;

  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql;
