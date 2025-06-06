-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Decks table
CREATE TABLE decks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Metadata for imports
  source TEXT, -- 'quizlet', 'manual', 'import'
  source_id TEXT, -- original ID if imported
  tags TEXT[] DEFAULT '{}'
);

-- Cards table
CREATE TABLE cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Additional fields for rich content
  front_image_url TEXT,
  back_image_url TEXT,
  hints TEXT,
  order_index INTEGER DEFAULT 0
);

-- Study sessions table
CREATE TABLE study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  total_cards INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  session_type TEXT DEFAULT 'review' -- 'review', 'learn', 'test'
);

-- Card progress table (for spaced repetition algorithm)
CREATE TABLE card_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
  
  -- Spaced repetition fields
  ease_factor REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Performance tracking
  total_reviews INTEGER DEFAULT 0,
  correct_reviews INTEGER DEFAULT 0,
  last_reviewed TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'new', -- 'new', 'learning', 'review', 'mastered'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, card_id)
);

-- Study logs table (detailed review history)
CREATE TABLE study_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
  
  was_correct BOOLEAN NOT NULL,
  difficulty_rating INTEGER, -- 1-4 (again, hard, good, easy)
  response_time_ms INTEGER,
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deck sharing/collaboration (for future features)
CREATE TABLE deck_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  permission_level TEXT DEFAULT 'view', -- 'view', 'edit'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(deck_id, shared_with_user_id)
);

-- Indexes for performance
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_cards_deck_id ON cards(deck_id);
CREATE INDEX idx_card_progress_user_id ON card_progress(user_id);
CREATE INDEX idx_card_progress_next_review ON card_progress(next_review_date);
CREATE INDEX idx_study_logs_user_id ON study_logs(user_id);
CREATE INDEX idx_study_logs_card_id ON study_logs(card_id);
CREATE INDEX idx_study_sessions_user_deck ON study_sessions(user_id, deck_id);

-- Row Level Security Policies

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Decks
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own decks" ON decks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public decks" ON decks FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert own decks" ON decks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own decks" ON decks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own decks" ON decks FOR DELETE USING (auth.uid() = user_id);

-- Cards
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view cards from accessible decks" ON cards FOR SELECT 
  USING (deck_id IN (
    SELECT id FROM decks WHERE user_id = auth.uid() OR is_public = true
  ));
CREATE POLICY "Users can manage cards in own decks" ON cards FOR ALL 
  USING (deck_id IN (SELECT id FROM decks WHERE user_id = auth.uid()));

-- Card Progress
ALTER TABLE card_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own progress" ON card_progress FOR ALL USING (auth.uid() = user_id);

-- Study Sessions
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sessions" ON study_sessions FOR ALL USING (auth.uid() = user_id);

-- Study Logs
ALTER TABLE study_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own study logs" ON study_logs FOR ALL USING (auth.uid() = user_id);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_decks_updated_at BEFORE UPDATE ON decks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_card_progress_updated_at BEFORE UPDATE ON card_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();