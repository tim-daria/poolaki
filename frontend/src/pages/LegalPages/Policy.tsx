/** @file Privacy Policy page featuring collapsible section cards with inline arrows, default white card backgrounds, and native button styling. */
import { useState } from "react";
import { Container, Box, Typography, Paper, Button, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Link as RouterLink } from "react-router";

function Policy() {
  // State tracking expansion for each legal section, all set to true by default
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    sec1: true,
    sec2: true,
    sec3: true,
    sec4: true,
    sec5: true,
    sec6: true,
    sec7: true,
    sec8: true,
    sec9: true,
    sec10: true,
    sec11: true,
  });

  // Toggle helper for individual sections
  const toggleSection = (key: string) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <Container
      maxWidth="md"
      sx={{
        py: { xs: 3, sm: 6 },
        px: { xs: 2, sm: 3 },
        display: "flex",
        flexDirection: "column",
        gap: 3,
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
            Privacy Policy
          </Typography>
          <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600, display: "block" }}>
            Last updated: September 25, 2026
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

      <Typography variant="body1" sx={{ color: "text.primary", lineHeight: 1.6 }}>
        This Privacy Policy explains how Poolaki collects, uses and protects your personal data when you use our budgeting and transaction tracking application at poolaki.de (the “Service”). It is provided in compliance with the General Data Protection Regulation (GDPR) and the German Federal Data Protection Act (BDSG).
      </Typography>

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
            1. Data Controller
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            {expanded.sec1 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>
        {expanded.sec1 && (
          <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
              <strong>Name:</strong> Poolaki<br />
              <strong>Address:</strong> Harzer Str. 42, 12059 Berlin, Germany<br />
              <strong>Email:</strong> <a href="mailto:hello@poolaki.de">hello@poolaki.de</a>
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              We are the data controller responsible for the processing of your personal data in connection with this Service.
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
            2. Overview of Processing
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            {expanded.sec2 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>
        {expanded.sec2 && (
          <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
              Poolaki is a personal finance tool that allows users to track their transactions, income, expenses and savings. We process personal data only to the extent necessary to:
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
              <li>Provide and maintain your user account and the Service.</li>
              <li>Enable you to create and manage budgets, workspaces, transactions and goals.</li>
              <li>Ensure IT security, prevent fraud and troubleshoot errors.</li>
              <li>Comply with legal obligations.</li>
            </Box>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              We do <strong>not</strong> use automated decision-making, scoring or profiling that produces legal or similarly significant effects.
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
            3. Legal Bases (GDPR)
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            {expanded.sec3 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>
        {expanded.sec3 && (
          <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
              We process your personal data on the following legal bases under Art. 6(1) GDPR:
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary", fontSize: "0.95rem", lineHeight: 1.5 }}>
              <li><strong>Contract performance (Art. 6(1)(b) GDPR):</strong> To provide the Service, manage your account, and process your transactions, budgets and goals.</li>
              <li><strong>Legitimate interests (Art. 6(1)(f) GDPR):</strong> For IT security, error analysis, and basic operational logging.</li>
              <li><strong>Legal obligation (Art. 6(1)(c) GDPR):</strong> Where we must retain data for tax, commercial or other legal reasons.</li>
              <li><strong>Consent (Art. 6(1)(a) GDPR):</strong> Where required by law (e.g., certain non‑essential cookies, if introduced in the future).</li>
            </Box>
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
            4. Data Collected and Processing Activities
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            {expanded.sec4 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>
        {expanded.sec4 && (
          <Box display="flex" flexDirection="column" gap={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
              <strong>4.1 Registration and User Account:</strong> Email address, username, and hashed password stored securely in our database.<br />
              <strong>4.2 Login and Session Management:</strong> Session cookies (<code>sessionid</code>), CSRF token, and <code>localStorage</code> UI preferences.<br />
              <strong>4.3 OAuth Login via Intra 42:</strong> External profile data and linkage if configured.<br />
              <strong>4.4 Workspaces, Transactions and Goals:</strong> Custom user entries, budgets, and financial tracking logs.<br />
              <strong>4.5 Invitations and Notifications:</strong> Internal communication data between organization users.<br />
              <strong>4.6 AI Chat:</strong> Prompts and user identifiers sent securely to LLM providers if enabled.<br />
              <strong>4.7 Logs, Infrastructure and Monitoring:</strong> Proxy access, system diagnostics, and operational metrics.<br />
              <strong>4.8 External Resources:</strong> Google Fonts, Cloudflare services, and hosting infrastructure.
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
            5. Cookies and Consent
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            {expanded.sec5 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>
        {expanded.sec5 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
              We use strictly necessary cookies (<code>sessionid</code>, <code>csrftoken</code>) and local storage (<code>sidebar:collapsed</code>) for app navigation. Third-party utilities like Cloudflare and Google Fonts manage their respective edge cookies and resource loads.
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
            6. Data Security
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            {expanded.sec6 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>
        {expanded.sec6 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
              We employ robust technical measures including TLS encryption via Cloudflare, secure password hashing, and granular internal role-based access management.
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
            7. Data Retention
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            {expanded.sec7 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>
        {expanded.sec7 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
              Personal data is kept strictly as long as your account remains active or as required by German commercial and tax law statutory retention windows.
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
            8. Your Rights
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            {expanded.sec8 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>
        {expanded.sec8 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
              Under GDPR, you hold rights to access, rectify, erase, restrict, or port your data, as well as object to processing. Reach out via <a href="mailto:hello@poolaki.de">hello@poolaki.de</a>.
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
            9. Right to Lodge a Complaint
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            {expanded.sec9 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>
        {expanded.sec9 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
              You have the right to petition data protection supervisory authorities, such as the German Federal Commissioner for Data Protection and Freedom of Information (BfDI).
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
            10. Age Restriction & Additional Clauses
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            {expanded.sec10 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>
        {expanded.sec10 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
              Our platform is restricted to adults aged 18 and older. We do not engage in automated individual profiling. Minor updates are reflected through our revision timestamps.
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
            11. Contact
          </Typography>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            {expanded.sec11 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>
        {expanded.sec11 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
              <strong>Email:</strong> <a href="mailto:hello@poolaki.de">hello@poolaki.de</a><br />
              <strong>Postal Address:</strong> Poolaki, Harzer Str. 42, 12059 Berlin, Germany
            </Typography>
          </Box>
        )}
      </Paper>

      <Box pt={1}>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", textAlign: "center" }}>
          This Privacy Policy is provided in English. A German version is available and shall prevail for interpretation under German law.
        </Typography>
      </Box>
    </Container>
  );
}

// Named alias for react-router's route-level `lazy`
export { Policy as Component };