<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'po_number',
        'raw_material_id',
        'material_name',
        'supplier_name',
        'unit_of_measure',
        'quantity',
        'unit_cost',
        'total_cost',
        'expected_delivery_date',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'expected_delivery_date' => 'date',
    ];

    public function rawMaterial()
    {
        return $this->belongsTo(RawMaterial::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public static function generatePoNumber(): string
    {
        $date = now()->format('Ymd');
        $countToday = self::whereDate('created_at', now()->toDateString())->count() + 1;

        return 'PO-' . $date . '-' . str_pad((string) $countToday, 4, '0', STR_PAD_LEFT);
    }
}

