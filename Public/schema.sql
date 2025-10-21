-- إنشاء الجداول اللازمة في Supabase

-- جدول ملفات المستخدمين
CREATE TABLE user_profiles (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{}'
);

-- جدول الجلسات
CREATE TABLE sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    matches JSONB DEFAULT '[]',
    decks TEXT[] DEFAULT '{}',
    points_start INTEGER DEFAULT 1500,
    default_deck TEXT,
    peak_points INTEGER DEFAULT 1500,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول قوائم المجموعات
CREATE TABLE deck_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT,
    description TEXT,
    stats JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_lists ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
-- يمكن للمستخدمين رؤية وتعديل بياناتهم فقط
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- يمكن للجميع رؤية أسماء المستخدمين للأرشيف
CREATE POLICY "Anyone can view usernames" ON user_profiles
    FOR SELECT USING (true);

-- سياسات الجلسات
CREATE POLICY "Users can manage own sessions" ON sessions
    FOR ALL USING (auth.uid() = user_id);

-- سياسات قوائم المجموعات
CREATE POLICY "Users can manage own deck lists" ON deck_lists
    FOR ALL USING (auth.uid() = user_id);

-- دالة تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- مشغلات تحديث updated_at
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deck_lists_updated_at BEFORE UPDATE ON deck_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- دالة إنشاء ملف تعريف تلقائي عند تسجيل مستخدم جديد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, username)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();