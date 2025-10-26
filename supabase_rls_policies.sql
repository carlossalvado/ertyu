-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_package_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_appointment_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES FOR USERS (Business Owners)
-- =============================================================================

-- Services policies
CREATE POLICY "Users can view own services" ON services FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own services" ON services FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own services" ON services FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own services" ON services FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Professionals policies
CREATE POLICY "Users can view own professionals" ON professionals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own professionals" ON professionals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own professionals" ON professionals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own professionals" ON professionals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Appointments policies
CREATE POLICY "Users can view own appointments" ON appointments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own appointments" ON appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own appointments" ON appointments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own appointments" ON appointments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Customers policies
CREATE POLICY "Users can view own customers" ON customers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customers" ON customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own customers" ON customers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own customers" ON customers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Packages policies
CREATE POLICY "Users can view own packages" ON packages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own packages" ON packages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own packages" ON packages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own packages" ON packages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Package services policies
CREATE POLICY "Users can view own package services" ON package_services FOR SELECT TO authenticated USING (auth.uid() = (SELECT user_id FROM packages WHERE id = package_id));
CREATE POLICY "Users can insert own package services" ON package_services FOR INSERT TO authenticated WITH CHECK (auth.uid() = (SELECT user_id FROM packages WHERE id = package_id));
CREATE POLICY "Users can update own package services" ON package_services FOR UPDATE TO authenticated USING (auth.uid() = (SELECT user_id FROM packages WHERE id = package_id)) WITH CHECK (auth.uid() = (SELECT user_id FROM packages WHERE id = package_id));
CREATE POLICY "Users can delete own package services" ON package_services FOR DELETE TO authenticated USING (auth.uid() = (SELECT user_id FROM packages WHERE id = package_id));

-- Customer packages policies
CREATE POLICY "Users can view own customer packages" ON customer_packages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customer packages" ON customer_packages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own customer packages" ON customer_packages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own customer packages" ON customer_packages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Customer package services policies
CREATE POLICY "Users can view own customer package services" ON customer_package_services FOR SELECT TO authenticated USING (auth.uid() = (SELECT user_id FROM customer_packages WHERE id = customer_package_id));
CREATE POLICY "Users can insert own customer package services" ON customer_package_services FOR INSERT TO authenticated WITH CHECK (auth.uid() = (SELECT user_id FROM customer_packages WHERE id = customer_package_id));
CREATE POLICY "Users can update own customer package services" ON customer_package_services FOR UPDATE TO authenticated USING (auth.uid() = (SELECT user_id FROM customer_packages WHERE id = customer_package_id)) WITH CHECK (auth.uid() = (SELECT user_id FROM customer_packages WHERE id = customer_package_id));
CREATE POLICY "Users can delete own customer package services" ON customer_package_services FOR DELETE TO authenticated USING (auth.uid() = (SELECT user_id FROM customer_packages WHERE id = customer_package_id));

-- Appointment services policies
CREATE POLICY "Users can view own appointment services" ON appointment_services FOR SELECT TO authenticated USING (auth.uid() = (SELECT user_id FROM appointments WHERE id = appointment_id));
CREATE POLICY "Users can insert own appointment services" ON appointment_services FOR INSERT TO authenticated WITH CHECK (auth.uid() = (SELECT user_id FROM appointments WHERE id = appointment_id));
CREATE POLICY "Users can update own appointment services" ON appointment_services FOR UPDATE TO authenticated USING (auth.uid() = (SELECT user_id FROM appointments WHERE id = appointment_id)) WITH CHECK (auth.uid() = (SELECT user_id FROM appointments WHERE id = appointment_id));
CREATE POLICY "Users can delete own appointment services" ON appointment_services FOR DELETE TO authenticated USING (auth.uid() = (SELECT user_id FROM appointments WHERE id = appointment_id));

-- Professional services policies
CREATE POLICY "Users can view professional services for their professionals" ON professional_services FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_services.professional_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can insert professional services for their professionals" ON professional_services FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_services.professional_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can update professional services for their professionals" ON professional_services FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_services.professional_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_services.professional_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can delete professional services for their professionals" ON professional_services FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_services.professional_id AND p.user_id = auth.uid()));

-- Professional commissions policies
CREATE POLICY "Users can view their own professional commissions" ON professional_commissions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own professional commissions" ON professional_commissions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own professional commissions" ON professional_commissions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own professional commissions" ON professional_commissions FOR DELETE USING (user_id = auth.uid());

-- WhatsApp agent config policies
CREATE POLICY "Users can manage their whatsapp config" ON whatsapp_agent_config FOR ALL TO authenticated USING (auth.uid() = user_id);

-- WhatsApp keys policies
CREATE POLICY "Users can manage their whatsapp keys" ON whatsapp_keys FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view their chat messages" ON chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their chat messages" ON chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- RLS POLICIES FOR PROFESSIONALS
-- =============================================================================

-- Function to get professional ID from JWT
CREATE OR REPLACE FUNCTION get_professional_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM professionals
    WHERE email = auth.jwt() ->> 'email'
    AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Professional services access
CREATE POLICY "Professionals can view their assigned services" ON services FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM professional_services ps WHERE ps.service_id = services.id AND ps.professional_id = get_professional_id()));

-- Professional customers access
CREATE POLICY "Professionals can view their customers" ON customers FOR SELECT TO authenticated USING (professional_id = get_professional_id());
CREATE POLICY "Professionals can update their customers" ON customers FOR UPDATE TO authenticated USING (professional_id = get_professional_id()) WITH CHECK (professional_id = get_professional_id());

-- Professional packages access
CREATE POLICY "Professionals can view packages from their business" ON packages FOR SELECT TO authenticated USING (user_id = (SELECT user_id FROM professionals WHERE id = get_professional_id()));

-- Professional appointments access
CREATE POLICY "Professionals can view their appointments" ON appointments FOR SELECT TO authenticated USING (professional_id = get_professional_id());
CREATE POLICY "Professionals can insert their appointments" ON appointments FOR INSERT TO authenticated WITH CHECK (professional_id = get_professional_id());
CREATE POLICY "Professionals can update their appointments" ON appointments FOR UPDATE TO authenticated USING (professional_id = get_professional_id()) WITH CHECK (professional_id = get_professional_id());
CREATE POLICY "Professionals can delete their appointments" ON appointments FOR DELETE TO authenticated USING (professional_id = get_professional_id());

-- Professional appointment services access
CREATE POLICY "Professionals can view appointment services" ON appointment_services FOR SELECT TO authenticated USING (appointment_id IN (SELECT id FROM appointments WHERE professional_id = get_professional_id()));
CREATE POLICY "Professionals can insert appointment services" ON appointment_services FOR INSERT TO authenticated WITH CHECK (appointment_id IN (SELECT id FROM appointments WHERE professional_id = get_professional_id()));
CREATE POLICY "Professionals can update appointment services" ON appointment_services FOR UPDATE TO authenticated USING (appointment_id IN (SELECT id FROM appointments WHERE professional_id = get_professional_id())) WITH CHECK (appointment_id IN (SELECT id FROM appointments WHERE professional_id = get_professional_id()));
CREATE POLICY "Professionals can delete appointment services" ON appointment_services FOR DELETE TO authenticated USING (appointment_id IN (SELECT id FROM appointments WHERE professional_id = get_professional_id()));

-- Professional package services access
CREATE POLICY "Professionals can view package services" ON package_services FOR SELECT TO authenticated USING (package_id IN (SELECT id FROM packages WHERE user_id = (SELECT user_id FROM professionals WHERE id = get_professional_id())));

-- Professional customer packages access
CREATE POLICY "Professionals can view customer packages" ON customer_packages FOR SELECT TO authenticated USING (customer_id IN (SELECT id FROM customers WHERE professional_id = get_professional_id()));
CREATE POLICY "Professionals can insert customer packages" ON customer_packages FOR INSERT TO authenticated WITH CHECK (customer_id IN (SELECT id FROM customers WHERE professional_id = get_professional_id()));
CREATE POLICY "Professionals can update customer packages" ON customer_packages FOR UPDATE TO authenticated USING (customer_id IN (SELECT id FROM customers WHERE professional_id = get_professional_id())) WITH CHECK (customer_id IN (SELECT id FROM customers WHERE professional_id = get_professional_id()));
CREATE POLICY "Professionals can delete customer packages" ON customer_packages FOR DELETE TO authenticated USING (customer_id IN (SELECT id FROM customers WHERE professional_id = get_professional_id()));

-- Professional customer package services access
CREATE POLICY "Professionals can view customer package services" ON customer_package_services FOR SELECT TO authenticated USING (customer_package_id IN (SELECT id FROM customer_packages WHERE customer_id IN (SELECT id FROM customers WHERE professional_id = get_professional_id())));
CREATE POLICY "Professionals can insert customer package services" ON customer_package_services FOR INSERT TO authenticated WITH CHECK (customer_package_id IN (SELECT id FROM customer_packages WHERE customer_id IN (SELECT id FROM customers WHERE professional_id = get_professional_id())));
CREATE POLICY "Professionals can update customer package services" ON customer_package_services FOR UPDATE TO authenticated USING (customer_package_id IN (SELECT id FROM customer_packages WHERE customer_id IN (SELECT id FROM customers WHERE professional_id = get_professional_id()))) WITH CHECK (customer_package_id IN (SELECT id FROM customer_packages WHERE customer_id IN (SELECT id FROM customers WHERE professional_id = get_professional_id())));
CREATE POLICY "Professionals can delete customer package services" ON customer_package_services FOR DELETE TO authenticated USING (customer_package_id IN (SELECT id FROM customer_packages WHERE customer_id IN (SELECT id FROM customers WHERE professional_id = get_professional_id())));

-- Professional services assignment access
CREATE POLICY "Professionals can view their service assignments" ON professional_services FOR SELECT TO authenticated USING (professional_id = get_professional_id());

-- Professional profile access
CREATE POLICY "Professionals can view their own profile" ON professionals FOR SELECT TO authenticated USING (id = get_professional_id());
CREATE POLICY "Professionals can update their own profile" ON professionals FOR UPDATE TO authenticated USING (id = get_professional_id()) WITH CHECK (id = get_professional_id());

-- Professional chat messages access
CREATE POLICY "Professionals can view chat messages for their customers" ON chat_messages FOR SELECT TO authenticated USING (customer_phone IN (SELECT phone FROM customers WHERE professional_id = get_professional_id()));
CREATE POLICY "Professionals can insert chat messages for their customers" ON chat_messages FOR INSERT TO authenticated WITH CHECK (customer_phone IN (SELECT phone FROM customers WHERE professional_id = get_professional_id()));

-- =============================================================================
-- SHARED DATA POLICIES
-- =============================================================================

-- Shared services policies
CREATE POLICY "Admins can view all shared services" ON shared_services FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Admins can manage shared services" ON shared_services FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Professionals can view their shared services" ON shared_services FOR SELECT TO authenticated USING (professional_id = get_professional_id());

-- Shared customers policies
CREATE POLICY "Admins can view all shared customers" ON shared_customers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Admins can manage shared customers" ON shared_customers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Professionals can view their shared customers" ON shared_customers FOR SELECT TO authenticated USING (professional_id = get_professional_id());
CREATE POLICY "Professionals can update their shared customers" ON shared_customers FOR UPDATE TO authenticated USING (professional_id = get_professional_id()) WITH CHECK (professional_id = get_professional_id());

-- Shared packages policies
CREATE POLICY "Admins can view all shared packages" ON shared_packages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Admins can manage shared packages" ON shared_packages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Professionals can view their shared packages" ON shared_packages FOR SELECT TO authenticated USING (professional_id = get_professional_id());

-- Shared customer packages policies
CREATE POLICY "Admins can view all shared customer packages" ON shared_customer_packages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Admins can manage shared customer packages" ON shared_customer_packages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Professionals can view their shared customer packages" ON shared_customer_packages FOR SELECT TO authenticated USING (professional_id = get_professional_id());
CREATE POLICY "Professionals can update their shared customer packages" ON shared_customer_packages FOR UPDATE TO authenticated USING (professional_id = get_professional_id()) WITH CHECK (professional_id = get_professional_id());

-- Shared appointment data policies
CREATE POLICY "Admins can view all shared appointment data" ON shared_appointment_data FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Admins can insert shared appointment data" ON shared_appointment_data FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Admins can update shared appointment data" ON shared_appointment_data FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Admins can delete shared appointment data" ON shared_appointment_data FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Professionals can view their shared appointment data" ON shared_appointment_data FOR SELECT TO authenticated USING (professional_id = get_professional_id());
CREATE POLICY "Professionals can update their shared appointment data" ON shared_appointment_data FOR UPDATE TO authenticated USING (professional_id = get_professional_id()) WITH CHECK (professional_id = get_professional_id());