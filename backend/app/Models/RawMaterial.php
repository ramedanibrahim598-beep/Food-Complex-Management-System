<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RawMaterial extends Model
{
    use HasFactory;

    protected $appends = [
        'stock_status',
        'stock_value',
    ];

    protected $fillable = [
        'material_name',
        'material_code',
        'category',
        'unit_of_measure',
        'current_stock',
        'minimum_stock',
        'maximum_stock',
        'unit_cost',
        'supplier_name',
        'supplier_contact',
        'last_purchase_date',
        'last_purchase_quantity',
        'last_purchase_cost',
        'status',
        'description',
        'storage_location',
        'expiry_date',
    ];

    protected $casts = [
        'current_stock' => 'decimal:2',
        'minimum_stock' => 'decimal:2',
        'maximum_stock' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'last_purchase_quantity' => 'decimal:2',
        'last_purchase_cost' => 'decimal:2',
        'last_purchase_date' => 'date',
        'expiry_date' => 'date',
    ];

    /**
     * Get production details that use this raw material
     */
    public function productionDetails()
    {
        return $this->hasMany(ProductionDetail::class);
    }

    /**
     * Check if material is low in stock
     */
    public function isLowStock()
    {
        return $this->current_stock <= $this->minimum_stock;
    }

    /**
     * Check if material is expired or expiring soon
     */
    public function isExpiringSoon($days = 30)
    {
        if (!$this->expiry_date) return false;
        return $this->expiry_date->diffInDays(now()) <= $days;
    }

    /**
     * Get stock status
     */
    public function getStockStatusAttribute()
    {
        if ($this->current_stock <= 0) return 'out_of_stock';
        if ($this->isLowStock()) return 'low_stock';
        if ($this->current_stock >= $this->maximum_stock) return 'overstock';
        return 'normal';
    }

    /**
     * Calculate total value of current stock
     */
    public function getStockValueAttribute()
    {
        return $this->current_stock * $this->unit_cost;
    }
}
