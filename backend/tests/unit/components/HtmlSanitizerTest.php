<?php

namespace tests\unit\components;

use backend\components\HtmlSanitizer;
use Codeception\Test\Unit;

class HtmlSanitizerTest extends Unit
{
    public function testCleanRemovesScriptsAndEventHandlers()
    {
        $html = '<p onclick="alert(1)">Hello<script>alert(2)</script><a href="javascript:alert(3)">bad</a></p>';

        $clean = HtmlSanitizer::clean($html);

        $this->assertStringContainsString('<p>Hello', $clean);
        $this->assertStringNotContainsString('onclick', $clean);
        $this->assertStringNotContainsString('<script', $clean);
        $this->assertStringNotContainsString('javascript:', $clean);
    }

    public function testCleanAllowsBasicFormattingAndSafeLinks()
    {
        $html = '<p><strong>Hello</strong> <a href="https://example.edu/help">help</a></p>';

        $clean = HtmlSanitizer::clean($html);

        $this->assertStringContainsString('<strong>Hello</strong>', $clean);
        $this->assertStringContainsString('href="https://example.edu/help"', $clean);
    }
}
