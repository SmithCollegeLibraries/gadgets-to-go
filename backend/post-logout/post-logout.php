
<?php
// post-logout.php

// Get the last page from the query string
$lastPage = isset($_GET['lastPage']) ? $_GET['lastPage'] : '/';

// Redirect back to the last page or home page
header('Location: ' . $lastPage);
exit();
