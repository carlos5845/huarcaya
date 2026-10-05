<?php

namespace App\Helpers;

class NumberToWordsHelper
{
    private static array $unidades = [
        0 => '', 1 => 'UN', 2 => 'DOS', 3 => 'TRES', 4 => 'CUATRO', 5 => 'CINCO',
        6 => 'SEIS', 7 => 'SIETE', 8 => 'OCHO', 9 => 'NUEVE', 10 => 'DIEZ',
        11 => 'ONCE', 12 => 'DOCE', 13 => 'TRECE', 14 => 'CATORCE', 15 => 'QUINCE',
        16 => 'DIECISEIS', 17 => 'DIECISIETE', 18 => 'DIECIOCHO', 19 => 'DIECINUEVE',
        20 => 'VEINTE', 21 => 'VEINTIUN', 22 => 'VEINTIDOS', 23 => 'VEINTITRES',
        24 => 'VEINTICUATRO', 25 => 'VEINTICINCO', 26 => 'VEINTISEIS', 27 => 'VEINTISIETE',
        28 => 'VEINTIOCHO', 29 => 'VEINTINUEVE',
    ];

    private static array $decenas = [
        30 => 'TREINTA', 40 => 'CUARENTA', 50 => 'CINCUENTA',
        60 => 'SESENTA', 70 => 'SETENTA', 80 => 'OCHENTA', 90 => 'NOVENTA',
    ];

    private static array $centenas = [
        100 => 'CIEN', 200 => 'DOSCIENTOS', 300 => 'TRESCIENTOS', 400 => 'CUATROCIENTOS',
        500 => 'QUINIENTOS', 600 => 'SEISCIENTOS', 700 => 'SETECIENTOS', 800 => 'OCHOCIENTOS',
        900 => 'NOVECIENTOS',
    ];

    /**
     * Convierte un monto numérico a su representación en letras en español.
     * Ejemplo: 7.36 -> "SON: SIETE CON 36/100 SOLES"
     */
    public static function toWords(float|int|string $number, string $currency = 'PEN'): string
    {
        $amount = (float) $number;
        $whole = (int) floor($amount);
        $fraction = (int) round(($amount - $whole) * 100);
        $fractionStr = str_pad((string) $fraction, 2, '0', STR_PAD_LEFT).'/100';

        $words = self::convertWholeNumber($whole);
        if (empty($words)) {
            $words = 'CERO';
        }

        $currencyUpper = strtoupper($currency);
        $currencyName = ($currencyUpper === 'USD') ? 'DÓLARES AMERICANOS' : 'SOLES';

        return "SON: {$words} CON {$fractionStr} {$currencyName}";
    }

    private static function convertWholeNumber(int $num): string
    {
        if ($num === 0) {
            return '';
        }

        if ($num < 30) {
            return self::$unidades[$num] ?? '';
        }

        if ($num < 100) {
            $ten = (int) (floor($num / 10) * 10);
            $unit = $num % 10;

            return self::$decenas[$ten].($unit > 0 ? ' Y '.self::$unidades[$unit] : '');
        }

        if ($num === 100) {
            return 'CIEN';
        }

        if ($num < 1000) {
            $hundred = (int) (floor($num / 100) * 100);
            $rest = $num % 100;
            $prefix = ($hundred === 100) ? 'CIENTO' : (self::$centenas[$hundred] ?? '');

            return trim($prefix.' '.self::convertWholeNumber($rest));
        }

        if ($num < 1000000) {
            $thousands = (int) floor($num / 1000);
            $rest = $num % 1000;
            $prefix = ($thousands === 1) ? 'MIL' : self::convertWholeNumber($thousands).' MIL';

            return trim($prefix.' '.self::convertWholeNumber($rest));
        }

        if ($num < 1000000000) {
            $millions = (int) floor($num / 1000000);
            $rest = $num % 1000000;
            $prefix = ($millions === 1) ? 'UN MILLÓN' : self::convertWholeNumber($millions).' MILLONES';

            return trim($prefix.' '.self::convertWholeNumber($rest));
        }

        return (string) $num;
    }
}
