<?php

namespace backend\components;

use yii\helpers\HtmlPurifier;

class HtmlSanitizer
{
    public static function clean($html)
    {
        return HtmlPurifier::process((string)$html, [
            'HTML.Allowed' => 'p,br,strong,b,em,i,u,ul,ol,li,a[href|title|target|rel]',
            'URI.AllowedSchemes' => [
                'http' => true,
                'https' => true,
                'mailto' => true,
            ],
            'Attr.AllowedFrameTargets' => ['_blank'],
            'HTML.Nofollow' => true,
            'HTML.TargetBlank' => true,
            'AutoFormat.RemoveEmpty' => true,
        ]);
    }
}
