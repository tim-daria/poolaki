/** @file Terms of Service page featuring a sticky accordion sidebar, collapsible section cards, and native button styling. */
import { useState } from "react";
import { Container, Box, Typography, Paper, Button, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Link as RouterLink } from "react-router";

// Clean array structure for the sidebar summary to avoid code repetition
const SUMMARY_POINTS = [
  {
    id: "sum1",
    title: "Who can use Poolaki",
    body: "Only people aged 18+. You create one personal account (username, email, password) and you’re responsible for keeping it secure.",
  },
  {
    id: "sum2",
    title: "What Poolaki is for",
    body: "It’s an online tool to track your own transactions, income, expenses, savings and goals, and to share workspaces with others. You may only upload your own financial data, not unrelated or illegal content.",
  },
  {
    id: "sum3",
    title: "What you can’t do",
    body: "You may not copy, resell, reverse engineer, scrape or abuse the Service, or try to access other people’s data. We can suspend or close accounts that break these rules or are used by under‑18s.",
  },
  {
    id: "sum4",
    title: "No guarantees, limited liability",
    body: "The Service is provided “as is” with no warranties. Under German law we’re fully liable for intent or gross negligence, and for slight negligence only for essential obligations and typical, foreseeable damage; other damages (like data loss or lost profits) are excluded where the law allows.",
  },
  {
    id: "sum5",
    title: "Changes, cancellation and AI",
    body: "We may update features and the Terms; for important changes we’ll ask you to actively accept them, and if you don’t accept you can cancel by emailing hello@poolaki.de. You can cancel anytime by email; we’ll give you time (typically 30 days) to export your data. The AI assistant helps you understand your data but doesn’t give financial advice and can make mistakes.",
  },
];

function Terms() {
  // State tracking expansion for the main legal sections, all set to true by default
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    sec1: true, sec2: true, sec3: true, sec4: true, sec5: true, sec6: true,
    sec7: true, sec8: true, sec9: true, sec10: true, sec11: true, sec12: true,
    sec13: true, sec14: true, sec15: true, sec16: true,
  });

  // State tracking expansion for the sidebar summary, all set to false (folded) by default
  const [sidebarExpanded, setSidebarExpanded] = useState<Record<string, boolean>>({});

  // Toggle helper for main sections
  const toggleSection = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Toggle helper for sidebar sections
  const toggleSidebar = (key: string) => {
    setSidebarExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Container
      maxWidth="lg" // Increased width to accommodate the sidebar
      sx={{
        py: { xs: 3, sm: 6 },
        px: { xs: 2, sm: 3 },
        display: "flex",
        flexDirection: "column",
        gap: { xs: 3, md: 4 },
        // Body links only — RouterLink buttons render as <a> and would inherit
        // primary.main on a primary.main fill if this matched .MuiButton-root.
        "& a:not(.MuiButton-root)": {
          color: "primary.main",
          textDecoration: "underline",
          "&:hover": {
            color: "primary.dark",
          },
        },
      }}
    >
      {/* Top header row: Page title on left, native primary button on right */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "1.75rem", sm: "2rem" },
              mb: 0.5,
              color: "text.primary",
              fontWeight: 700,
            }}
          >
            Terms of Service
          </Typography>
          <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600, display: "block" }}>
            Last updated: 25 September 2026
          </Typography>
        </Box>

        {/* Back to Home button using standard primary contained variant */}
        <Button
          component={RouterLink}
          to="/"
          startIcon={<ArrowBackIcon />}
          variant="contained"
          color="primary"
          sx={{
            borderRadius: 999,
            px: 3,
            py: 1,
            color: "primary.contrastText",
          }}
        >
          Back to Homepage
        </Button>
      </Box>

      {/* Two-column layout container */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: { xs: 4, md: 6 },
          alignItems: "flex-start",
        }}
      >
        {/* Left Sidebar: TL;DR Summary (Sticky on desktop) */}
        <Box
          component="aside"
          sx={{
            flex: "0 0 320px", // Fixed width on desktop
            position: { md: "sticky" },
            top: { md: 24 }, // Sticks to the top of the viewport when scrolling
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "background.paper",
              borderTop: "4px solid",
              borderTopColor: "primary.main",
            }}
          >
            <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary", mb: 2.5 }}>
              5 Key Points (TL;DR)
            </Typography>
            
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {SUMMARY_POINTS.map((point) => (
                <Box key={point.id} sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 1 }}>
                  <Box
                    onClick={() => toggleSidebar(point.id)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      "&:hover Typography": { color: "primary.main" }, // Subtle hover effect
                    }}
                  >
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: 600, 
                        color: "text.primary", 
                        transition: "color 0.2s" 
                      }}
                    >
                      {point.title}
                    </Typography>
                    <IconButton size="small" sx={{ color: "text.secondary", p: 0.5 }}>
                      {sidebarExpanded[point.id] ? (
                        <KeyboardArrowUpIcon fontSize="small" />
                      ) : (
                        <KeyboardArrowDownIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                  {sidebarExpanded[point.id] && (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: "text.secondary", 
                        mt: 1, 
                        pb: 1, 
                        fontSize: "0.85rem", 
                        lineHeight: 1.5 
                      }}
                    >
                      {point.body}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* Right Main Content: Full Terms */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Introductory text */}
          <Box>
            <Typography variant="body1" sx={{ color: "text.primary", lineHeight: 1.6 }}>
              These Terms of Service (“Terms”) govern your access to and use of the Poolaki budgeting and transaction tracking application available at poolaki.de (the “Service”). By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
            </Typography>
          </Box>

          {/* Section 1 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec1")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                1. Provider and Contact
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec1 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec1 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>Provider:</strong> Poolaki<br />
                  <strong>Address:</strong> Harzer Str. 42, 12059 Berlin, Germany<br />
                  <strong>Email:</strong> <a href="mailto:hello@poolaki.de">hello@poolaki.de</a>
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  Poolaki is the provider of the Service and data controller under applicable data protection laws. Our Privacy Policy (available at <RouterLink to="/policy">poolaki.de/policy</RouterLink>) forms part of these Terms and explains how we process your personal data.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 2 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec2")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                2. Eligibility and Account Creation
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec2 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec2 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>2.1</strong> The Service is intended solely for individuals aged 18 years or older. By creating an account, you confirm that you are at least 18.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>2.2</strong> To use the Service, you must create an account by providing:
                </Typography>
                <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  <li>a username;</li>
                  <li>a valid email address; and</li>
                  <li>a password.</li>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>2.3</strong> You may not share your account or credentials with others, except as explicitly enabled by shared workspace features within the Service.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 3 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec3")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                3. Description of the Service
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec3 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec3 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>3.1</strong> Poolaki is a personal finance tool that allows users to:
                </Typography>
                <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  <li>track transactions, income, expenses and savings;</li>
                  <li>create and manage budgets, workspaces and goals;</li>
                  <li>share workspaces with other users; and</li>
                  <li>receive in-app and email notifications about relevant events.</li>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>3.2</strong> The Service is provided online only (“as a service”). No software is licensed to you for installation or offline use. Access is granted via web browser or supported clients.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>3.3</strong> We currently offer the Service free of charge. We may introduce paid features, plans or subscriptions in the future. Any such changes will be communicated in advance and will require your explicit acceptance before they become binding.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 4 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec4")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                4. User Content and Responsibilities
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec4 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec4 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>4.1</strong> “User Content” means any data you enter into the Service, including transactions, categories, goals, notes and any other information you upload or create.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>4.2</strong> You are solely responsible for your User Content and for ensuring that you have all necessary rights to share it within the Service (including in shared workspaces).
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>4.3</strong> The Service is designed for you to record your own financial transactions and related information only. You must not upload, share or transmit any content that:
                </Typography>
                <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  <li>is illegal, defamatory, obscene, threatening or harassing;</li>
                  <li>infringes third-party rights (including intellectual property or data protection rights);</li>
                  <li>contains malware, viruses or harmful code; or</li>
                  <li>is unrelated to personal finance tracking (e.g. general documents, media, or non-financial data).</li>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>4.4</strong> We do not provide mechanisms for reporting illicit content within the Service. If you become aware of unlawful content or misuse, please contact us at <a href="mailto:hello@poolaki.de">hello@poolaki.de</a>.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 5 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec5")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                5. Acceptable Use and Prohibited Conduct
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec5 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec5 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>5.1</strong> You may use the Service only for lawful purposes and in accordance with these Terms.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>5.2</strong> You must not:
                </Typography>
                <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  <li>copy, reproduce, distribute, sell, rent or otherwise exploit the Service;</li>
                  <li>reverse engineer, decompile, disassemble or attempt to derive source code from the Service;</li>
                  <li>modify, adapt, translate or create derivative works of the Service;</li>
                  <li>access the Service via automated means (bots, scrapers, etc.) without our prior written consent;</li>
                  <li>interfere with or disrupt the Service or servers or networks connected to the Service;</li>
                  <li>attempt to gain unauthorized access to any part of the Service, other accounts, or computer systems or networks;</li>
                  <li>use the Service to transmit spam, chain letters, pyramid schemes or unsolicited commercial communications.</li>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>5.3</strong> We may monitor usage patterns to ensure security, prevent fraud and maintain service integrity.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 6 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec6")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                6. Intellectual Property
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec6 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec6 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>6.1</strong> The Service, including all software, code, documentation, designs, logos, trademarks and other materials, is owned by albetanc, cwick, dtimofee, nefimov, tsemenov and/or their licensors. “Poolaki” is currently not a registered trademark.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>6.2</strong> Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable right to access and use the Service for your personal, non-commercial purposes.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>6.3</strong> Except as expressly stated, nothing in these Terms grants you any license or right to any intellectual property of Poolaki or third parties.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 7 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec7")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                7. No Warranty; “As Is” Basis
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec7 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec7 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>7.1</strong> The Service is provided on an “as is” and “as available” basis, without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, reliability or uninterrupted availability.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>7.2</strong> We do not warrant that:
                </Typography>
                <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  <li>the Service will meet your requirements;</li>
                  <li>the Service will be uninterrupted, timely, secure or error-free;</li>
                  <li>defects will be corrected; or</li>
                  <li>the Service or the server that makes it available are free of viruses or other harmful components.</li>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>7.3</strong> You acknowledge that use of the Service is at your sole risk.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 8 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec8")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                8. Limitation of Liability (German Law Compliant)
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec8 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec8 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>8.1 Intent and gross negligence.</strong> We shall be liable without limitation for damages caused by intent (Vorsatz) or gross negligence (grobe Fahrlässigkeit) on our part or on the part of our legal representatives or vicarious agents.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>8.2 Slight negligence – essential obligations.</strong> In case of slight negligence (leichte Fahrlässigkeit), we shall be liable only for breach of essential contractual obligations (Kardinalpflichten), i.e. obligations whose fulfilment is indispensable for the proper performance of the contract and on whose observance you may regularly rely. In such cases, liability shall be limited to foreseeable, typical damage.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>8.3 Exclusions.</strong> To the extent permitted by mandatory German law, we exclude liability for:
                </Typography>
                <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  <li>loss of data, except where caused by intent or gross negligence on our part;</li>
                  <li>loss of profits, business interruption, or any indirect, incidental, special or consequential damages;</li>
                  <li>damages arising from force majeure, third-party services, or your own negligence or breach of these Terms.</li>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>8.4 Mandatory statutory liability.</strong> Nothing in these Terms excludes or limits liability for:
                </Typography>
                <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  <li>injury to life, body or health;</li>
                  <li>claims under the German Product Liability Act (Produkthaftungsgesetz); or</li>
                  <li>any other liability that cannot be excluded or limited under mandatory German law.</li>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>8.5</strong> If any limitation of liability is held invalid or unenforceable, the remaining provisions shall remain in full force and effect.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 9 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec9")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                9. Service Levels, Maintenance and Availability
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec9 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec9 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>9.1</strong> We strive to provide a reliable and secure Service but do not guarantee any specific uptime percentage at this stage. We aim to follow industry-standard practices for consumer SaaS applications regarding availability and maintenance.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>9.2 Maintenance windows.</strong> We may perform planned maintenance that may temporarily affect availability. We will notify you by email in advance where reasonably practicable.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>9.3 Incidents and support.</strong> For technical issues or questions, you may contact us at <a href="mailto:hello@poolaki.de">hello@poolaki.de</a>. We aim to classify your request within 2 business days and will communicate next steps or expected resolution times as appropriate.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>9.4 SLA non-performance.</strong> Currently, we do not offer formal service credits or compensation for downtime or SLA non-performance. Any future SLA with specific uptime commitments, remedies or credits will be set out in separate terms and require your explicit acceptance.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 10 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec10")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                10. Changes to the Service and to These Terms
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec10 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec10 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>10.1 Changes to the Service.</strong> We may modify, suspend or discontinue any part of the Service (including features, modules or entire functionalities), or migrate to new versions, at any time. Where such changes materially affect your use, we will inform you by email in advance where reasonably practicable.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>10.2 Changes to these Terms (B2C, German law).</strong> We may update these Terms from time to time to reflect legal, regulatory or operational changes. For consumer contracts under German law:
                </Typography>
                <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  <li>We will notify you of any proposed changes in text form (e.g. by email or in-app notice) at least two months before the proposed effective date.</li>
                  <li>For changes that are not merely minor or administrative, your explicit consent is required for the changes to become part of your contract. We will ask you to actively accept the new Terms (e.g. by clicking “I agree”).</li>
                  <li>If you do not accept the changes, you may terminate your account by sending an email to <a href="mailto:hello@poolaki.de">hello@poolaki.de</a> before the effective date. Continued use after the effective date following your explicit acceptance will mean you are bound by the updated Terms.</li>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>10.3</strong> The latest version of these Terms will always be available at <RouterLink to="/terms">poolaki.de/terms</RouterLink>.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 11 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec11")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                11. Account Suspension and Termination
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec11 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec11 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>11.1 By you.</strong> Your contract is for an indefinite period. You may terminate your account at any time by sending an email to <a href="mailto:hello@poolaki.de">hello@poolaki.de</a>. Upon termination, we will provide you a reasonable period (typically 30 days) to export or download your data, subject to legal retention obligations.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>11.2 By us.</strong> We may suspend or terminate your account immediately, without prior notice, if:
                </Typography>
                <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  <li>you breach these Terms (including prohibited conduct or illegal use);</li>
                  <li>we suspect fraud, abuse or security risks;</li>
                  <li>you are under 18; or</li>
                  <li>we are required to do so by law or regulatory authority.</li>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>11.3</strong> Upon termination, we will delete or anonymize your personal data in accordance with our Privacy Policy and applicable law, except where we must retain data for legal reasons (e.g. tax or commercial law retention periods).
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 12 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec12")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                12. AI Assistant and LLM Features
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec12 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec12 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>12.1</strong> Poolaki may provide an AI-powered assistant that helps you understand your financial data and the Service. The AI functionality is provided as part of the Service and subject to these Terms.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>12.2 How it works (high level).</strong> The AI assistant:
                </Typography>
                <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  <li>receives specific, validated data from our backend (e.g. balances, transactions) as needed to answer your questions;</li>
                  <li>does not have direct access to the entire database;</li>
                  <li>uses embeddings and documentation about how the Service works; and</li>
                  <li>may connect to external large language model (LLM) providers, depending on your selection and configuration.</li>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>12.3 No financial advice.</strong> The AI assistant:
                </Typography>
                <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  <li>is designed to help you interpret your own data and understand Poolaki features;</li>
                  <li>does not provide financial, investment, tax or legal advice;</li>
                  <li>may make mistakes or provide incomplete information; and</li>
                  <li>should not be relied upon as the sole basis for financial decisions. You should always review and verify important information yourself or consult a qualified professional.</li>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>12.4 User choice of model.</strong> Where applicable, you may choose which LLM provider or model the assistant uses. You acknowledge that different models may have different behaviours, limitations and privacy characteristics. We are not responsible for the independent policies or performance of third-party LLM providers.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>12.5 No training on your data.</strong> We do not use your prompts or financial data to train general-purpose AI models. Your interactions may be logged for debugging, monitoring and improvement of the Service as described in our Privacy Policy.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>12.6 Limitation of liability for AI outputs.</strong> To the extent permitted by law, we do not guarantee the accuracy, completeness or suitability of AI-generated responses. Our liability limitations in Section 8 apply equally to AI-related features.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 13 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec13")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                13. Third-Party Services
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec13 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec13 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>13.1</strong> The Service may integrate with or rely on third-party services (e.g. hosting, email, fonts, CDN, LLM providers). These services are subject to their own terms and privacy policies.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>13.2</strong> We are not responsible for the availability, content, security or practices of third-party services. Your use of such services is at your own risk.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 14 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec14")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                14. Governing Law and Jurisdiction
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec14 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec14 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>14.1</strong> These Terms and your use of the Service are governed by the laws of the Federal Republic of Germany, to the exclusion of the UN Convention on Contracts for the International Sale of Goods (CISG).
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>14.2</strong> If you are a consumer with your habitual residence in Germany, any legal disputes shall be brought before the courts of Berlin, Germany, unless mandatory law provides otherwise.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>14.3</strong> We do not currently participate in any extrajudicial dispute resolution procedures.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Section 15 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec15")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                15. Indemnification
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec15 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec15 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>15.1</strong> To the extent permitted by law, you agree to indemnify and hold harmless Poolaki and its owners (albetanc, cwick, dtimofee, nefimov, tsemenov), officers, employees and agents from and against any claims, liabilities, damages, losses, costs or expenses (including reasonable legal fees) arising out of:
                </Typography>
                <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  <li>your breach of these Terms;</li>
                  <li>your User Content; or</li>
                  <li>your violation of any law or rights of third parties.</li>
                </Box>
              </Box>
            )}
          </Paper>

          {/* Section 16 */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                cursor: "pointer",
              }}
              onClick={() => toggleSection("sec16")}
            >
              <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "text.primary" }}>
                16. Miscellaneous
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {expanded.sec16 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>
            {expanded.sec16 && (
              <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>16.1 Entire agreement.</strong> These Terms, together with the <RouterLink to="/policy">Privacy Policy</RouterLink>, constitute the entire agreement between you and Poolaki regarding the Service.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>16.2 Severability.</strong> If any provision of these Terms is found invalid or unenforceable, the remaining provisions shall remain in full force and effect.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>16.3 Assignment.</strong> You may not assign your rights or obligations under these Terms without our prior written consent. We may assign our rights and obligations without your consent in connection with a merger, acquisition or sale of assets.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                  <strong>16.4 Contact.</strong> For any questions about these Terms, please contact us at <a href="mailto:hello@poolaki.de">hello@poolaki.de</a>.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Footer Disclaimer */}
          <Box pt={1} pb={4}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", textAlign: "center" }}>
              A German-language version of these Terms is available. In case of any discrepancy between the English and German versions, the German version shall prevail for interpretation under German law.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

// Named alias for react-router's route-level `lazy`
export { Terms as Component };