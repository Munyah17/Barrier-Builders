<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}
// Revalidate the session against the admins table — a deleted or deactivated
// account loses access immediately instead of riding an old session.
require_once __DIR__ . '/../api/state_store.php';
$me = bfs_session_admin();
if (!$me && isset($_SESSION['admin'])) {
    unset($_SESSION['admin']);
}
$display = 'Account';
$email = '';
if ($me) {
    $display = trim((string)($me['name'] ?? ''));
    if ($display === '' || strtolower($display) === 'yard admin') $display = (string)$me['user'];
    $email = (string)($me['email'] ?? '');
}
$bfsSession = $me ? [
    'id' => (string)($me['id'] ?? ''),
    'user' => (string)$me['user'],
    'name' => $display,
    'email' => $email,
    'role_id' => (string)($me['role_id'] ?? ''),
    'perms' => $me['perms'] ?? ['*'],
] : null;
?>
<!DOCTYPE html>
<html lang="en"<?= $me ? ' class="bfs-authed"' : '' ?>>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <style>html:not(.bfs-authed) #wrapper{display:none !important} html.bfs-authed #login-root{display:none !important}</style>
  <script>window.BFS_SESSION = <?= json_encode($bfsSession, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
  <meta name="generator" content="CoolAdmin 3.5.0">
  <title>Admin | Barrier Builders</title>
  <link rel="icon" href="../assets/favicon.png" type="image/png">
  <link href="css/font-face.css" rel="stylesheet" media="all">
  <link rel="preconnect" href="https://rsms.me/">
  <link rel="stylesheet" href="https://rsms.me/inter/inter.css">
  <link href="vendor/fontawesome-7.3.1/css/all.min.css" rel="stylesheet" media="all">
  <link href="vendor/bootstrap-5.3.8.min.css" rel="stylesheet" media="all">
  <link href="vendor/css-hamburgers/hamburgers.min.css" rel="stylesheet" media="all">
  <link href="css/theme.css?v=4" rel="stylesheet" media="all">
  <link href="css/app.css?v=4" rel="stylesheet" media="all">
  <link href="../css/admin.css?v=4" rel="stylesheet" media="all">
</head>
<body class="app">
  <div class="page-wrapper" id="wrapper">
    <header class="header-mobile d-block d-lg-none">
      <div class="header-mobile__bar">
        <div class="container-fluid">
          <div class="header-mobile-inner">
            <a class="logo" href="#/dashboard"><img src="../assets/favicon.png" alt="Barrier Builders" style="width:34px;height:34px;border-radius:8px"> <strong style="color:#fff;margin-left:8px">Barrier Admin</strong></a>
            <button class="hamburger hamburger--slider" type="button" aria-label="Toggle navigation"><span class="hamburger-box"><span class="hamburger-inner"></span></span></button>
          </div>
        </div>
      </div>
      <nav class="navbar-mobile">
        <div class="container-fluid">
          <ul class="navbar-mobile__list list-unstyled">
            <li><a href="#/dashboard"><i class="fa-solid fa-gauge-high"></i>Dashboard</a></li>
            <li><a href="#/analytics"><i class="fa-solid fa-chart-line"></i>Analytics</a></li>
            <li><a href="#/quotes"><i class="fa-solid fa-file-invoice-dollar"></i>Quotations</a></li>
            <li><a href="#/invoices"><i class="fa-solid fa-file-invoice"></i>Invoices</a></li>
            <li><a href="#/orders"><i class="fa-solid fa-truck-fast"></i>Orders</a></li>
            <li><a href="#/products"><i class="fa-solid fa-boxes-stacked"></i>Inventory</a></li>
            <li><a href="#/promotions"><i class="fa-solid fa-tags"></i>Promotions</a></li>
            <li><a href="#/gallery"><i class="fa-solid fa-images"></i>Gallery</a></li>
            <li><a href="#/content"><i class="fa-solid fa-pen-to-square"></i>Content</a></li>
            <li><a href="#/messages"><i class="fa-solid fa-envelope"></i>Messages</a></li>
            <li><a href="#/clients"><i class="fa-solid fa-users"></i>Clients</a></li>
            <li><a href="#/admins"><i class="fa-solid fa-user-shield"></i>Admins</a></li>
            <li><a href="#/roles"><i class="fa-solid fa-key"></i>Roles</a></li>
            <li><a href="#/settings"><i class="fa-solid fa-gear"></i>Settings</a></li>
            <li><a href="#/profile"><i class="fa-solid fa-circle-user"></i>Profile</a></li>
            <li><a href="../" target="_blank"><i class="fa-solid fa-globe"></i>View website</a></li>
            <li><a href="../api/data.php?logout=1" id="logoutMobile"><i class="fa-solid fa-power-off"></i>Sign out</a></li>
          </ul>
        </div>
      </nav>
    </header>
    <aside class="menu-sidebar" id="main-sidebar">
      <div class="logo">
        <a class="logo-link" href="#/dashboard" aria-label="Barrier Admin home">
          <img src="../assets/favicon.png" alt="" style="width:34px;height:34px;border-radius:8px">
          <span class="logo-text" style="margin-left:10px">Barrier <small style="display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;opacity:.7">Fencing Admin</small></span>
        </a>
        <button class="sidebar-close js-sidebar-toggle" type="button" aria-label="Close navigation"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </div>
      <div class="menu-sidebar__content js-scrollbar1">
        <nav class="navbar-sidebar">
          <ul class="list-unstyled navbar__list">
            <li class="has-sub">
              <a class="js-arrow" href="#"><i class="fa-solid fa-gauge-high"></i>Overview</a>
              <ul class="list-unstyled navbar__sub-list js-sub-list">
                <li><a href="#/dashboard" data-nav="dashboard">Dashboard</a></li>
                <li><a href="#/analytics" data-nav="analytics">Analytics</a></li>
              </ul>
            </li>
            <li class="has-sub">
              <a class="js-arrow" href="#"><i class="fa-solid fa-file-invoice-dollar"></i>Sales</a>
              <ul class="list-unstyled navbar__sub-list js-sub-list">
                <li><a href="#/quotes" data-nav="quotes">Quotations</a></li>
                <li><a href="#/invoices" data-nav="invoices">Invoices</a></li>
                <li><a href="#/orders" data-nav="orders">Orders</a></li>
              </ul>
            </li>
            <li class="has-sub">
              <a class="js-arrow" href="#"><i class="fa-solid fa-boxes-stacked"></i>Catalog</a>
              <ul class="list-unstyled navbar__sub-list js-sub-list">
                <li><a href="#/products" data-nav="products">Inventory</a></li>
                <li><a href="#/promotions" data-nav="promotions">Promotions</a></li>
                <li><a href="#/gallery" data-nav="gallery">Gallery</a></li>
                <li><a href="#/content" data-nav="content">Content</a></li>
              </ul>
            </li>
            <li><a href="#/messages" data-nav="messages"><i class="fa-solid fa-envelope"></i>Messages</a></li>
            <li><a href="#/clients" data-nav="clients"><i class="fa-solid fa-users"></i>Clients</a></li>
            <li><a href="#/admins" data-nav="admins"><i class="fa-solid fa-user-shield"></i>Admins</a></li>
            <li><a href="#/roles" data-nav="roles"><i class="fa-solid fa-key"></i>Roles</a></li>
            <li><a href="#/settings" data-nav="settings"><i class="fa-solid fa-gear"></i>Settings</a></li>
            <li><a href="#/profile" data-nav="profile"><i class="fa-solid fa-circle-user"></i>Profile</a></li>
          </ul>
          <ul class="list-unstyled navbar__list" style="margin-top:18px;border-top:1px solid rgba(255,255,255,.08);padding-top:14px">
            <li><a href="../" target="_blank"><i class="fa-solid fa-globe"></i>View website</a></li>
            <li><a href="../api/data.php?logout=1" id="logoutSide"><i class="fa-solid fa-power-off"></i>Sign out</a></li>
          </ul>
        </nav>
      </div>
    </aside>
    <div class="page-container">
      <header class="header-desktop">
        <div class="section__content section__content--p30">
          <div class="container-fluid">
            <div class="header-wrap">
              <button class="sidebar-toggle js-sidebar-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false" aria-controls="main-sidebar"><i class="fa-solid fa-bars" aria-hidden="true"></i></button>
              <div style="flex:1"></div>
              <div class="header-button">
                <div class="account-wrap">
                  <div class="account-item clearfix js-item-menu" role="button" tabindex="0" aria-haspopup="true" aria-label="Account menu">
                    <div class="image"><img src="images/icon/avatar-01.jpg" alt=""></div>
                    <div class="content"><a class="js-acc-btn" id="acct-name" href="#/profile"><?= htmlspecialchars($display, ENT_QUOTES, 'UTF-8') ?></a></div>
                    <div class="account-dropdown js-dropdown">
                      <div class="info clearfix">
                        <div class="image"><a href="#/profile"><img src="images/icon/avatar-01.jpg" alt=""></a></div>
                        <div class="content">
                          <h5 class="name"><a href="#/profile" id="acct-name-drop"><?= htmlspecialchars($display, ENT_QUOTES, 'UTF-8') ?></a></h5><span class="email" id="acct-email"><?= htmlspecialchars($email, ENT_QUOTES, 'UTF-8') ?></span>
                        </div>
                      </div>
                      <div class="account-dropdown__body">
                        <div class="account-dropdown__item"><a href="#/profile"><i class="fa-solid fa-circle-user"></i>Profile</a></div>
                        <div class="account-dropdown__item"><a href="../" target="_blank"><i class="fa-solid fa-globe"></i>View website</a></div>
                        <div class="account-dropdown__item"><a href="#/settings"><i class="fa-solid fa-gear"></i>Settings</a></div>
                      </div>
                      <div class="account-dropdown__footer"><a href="../api/data.php?logout=1" id="logout"><i class="fa-solid fa-power-off"></i>Logout</a></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main class="main-content" id="main-content">
        <div class="section__content section__content--p30">
          <div class="container-fluid">
            <div id="app"></div>
          </div>
        </div>
      </main>
    </div>
  </div>
  <div id="login-root">
    <div class="login-screen">
      <form class="login-card" id="login" method="post" action="../api/data.php">
        <div class="login-brand">
          <img src="../assets/logo.png" width="72" height="72" alt="Barrier Builders" class="login-logo">
        </div>
        <h1>Admin Panel</h1>
        <input type="hidden" name="action" value="login">
        <div class="login-field"><label>Username or email</label><input id="user" name="user" autocomplete="username" required></div>
        <div class="login-field"><label>Password</label><input id="pass" name="pass" type="password" autocomplete="current-password" required></div>
        <button class="login-btn" type="submit">Sign in</button>
        <p class="login-err" id="err"><?= isset($_GET['e']) ? 'Invalid credentials.' : '' ?></p>
      </form>
    </div>
  </div>
  <script src="../js/store.js?v=14"></script>
  <script src="../js/estimator.js?v=4"></script>
  <script src="js/admin-utils.js?v=3"></script>
  <script src="js/vanilla-utils.js?v=3"></script>
  <script src="vendor/bootstrap-5.3.8.bundle.min.js"></script>
  <script src="js/bootstrap5-init.js?v=3"></script>
  <script src="js/main-vanilla.js?v=4"></script>
  <script src="vendor/chartjs/chart.umd.js-4.5.1.min.js"></script>
<script src="js/admin-app.js?v=20"></script>
</body>
</html>
