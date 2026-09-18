import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, RequireAuth, RequireAdmin } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// BEYLO — merchant, checkout, auth and administration experiences
import Dashboard from "./pages/beylo/Dashboard";
import CreatePayment from "./pages/beylo/CreatePayment";
import Transactions from "./pages/beylo/Transactions";
import TransactionDetail from "./pages/beylo/TransactionDetail";
import Settlements, { SettlementDetail } from "./pages/beylo/Settlements";
import { Customers, Team, Reports, SettingsPage, Support } from "./pages/beylo/MerchantMisc";
import Checkout from "./pages/beylo/Checkout";
import Onboarding from "./pages/beylo/Onboarding";
import Docs from "./pages/beylo/Docs";
import { SignIn, ForgotPassword, ResetPassword, VerifyEmail, TwoFactor, TwoFactorSetup } from "./pages/beylo/Auth";
import {
  AdminOverview,
  AdminMerchants,
  AdminMerchantDetail,
  AdminPayments,
  AdminSettlements,
  AdminWebhooks,
  AdminAudit,
  AdminProviderHealth,
  AdminUsers,
} from "./pages/beylo/Admin";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />

              {/* Authentication */}
              <Route path="/signin" element={<SignIn />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/2fa" element={<TwoFactor />} />
              <Route path="/2fa-setup" element={<RequireAuth><TwoFactorSetup /></RequireAuth>} />

              {/* Merchant onboarding & docs */}
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/docs" element={<Docs />} />

              {/* Merchant dashboard — session protected */}
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/dashboard/create-payment" element={<RequireAuth><CreatePayment /></RequireAuth>} />
              <Route path="/dashboard/transactions" element={<RequireAuth><Transactions /></RequireAuth>} />
              <Route path="/dashboard/transactions/:id" element={<RequireAuth><TransactionDetail /></RequireAuth>} />
              <Route path="/dashboard/settlements" element={<RequireAuth><Settlements /></RequireAuth>} />
              <Route path="/dashboard/settlements/:id" element={<RequireAuth><SettlementDetail /></RequireAuth>} />
              <Route path="/dashboard/customers" element={<RequireAuth><Customers /></RequireAuth>} />
              <Route path="/dashboard/team" element={<RequireAuth><Team /></RequireAuth>} />
              <Route path="/dashboard/reports" element={<RequireAuth><Reports /></RequireAuth>} />
              <Route path="/dashboard/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
              <Route path="/dashboard/support" element={<RequireAuth><Support /></RequireAuth>} />

              {/* Public customer checkout */}
              <Route path="/pay/:id" element={<Checkout />} />
              <Route path="/pay" element={<Checkout />} />

              {/* BEYLO administration — platform admins only */}
              <Route path="/admin" element={<RequireAdmin><AdminOverview /></RequireAdmin>} />
              <Route path="/admin/merchants" element={<RequireAdmin><AdminMerchants /></RequireAdmin>} />
              <Route path="/admin/merchants/:id" element={<RequireAdmin><AdminMerchantDetail /></RequireAdmin>} />
              <Route path="/admin/payments" element={<RequireAdmin><AdminPayments /></RequireAdmin>} />
              <Route path="/admin/settlements" element={<RequireAdmin><AdminSettlements /></RequireAdmin>} />
              <Route path="/admin/webhooks" element={<RequireAdmin><AdminWebhooks /></RequireAdmin>} />
              <Route path="/admin/audit" element={<RequireAdmin><AdminAudit /></RequireAdmin>} />
              <Route path="/admin/provider-health" element={<RequireAdmin><AdminProviderHealth /></RequireAdmin>} />
              <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
