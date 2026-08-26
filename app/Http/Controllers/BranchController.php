<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBranchRequest;
use App\Http\Requests\UpdateBranchRequest;
use App\Models\Branch;
use Illuminate\Support\Str;
use Inertia\Inertia;

class BranchController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $branches = Branch::orderBy('id', 'asc')->get();

        return Inertia::render('branches/index', [
            'branches' => $branches,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreBranchRequest $request)
    {
        $data = $request->validated();
        $data['uuid'] = Str::uuid()->toString();
        $data['company_id'] = auth()->user()->company_id;

        $branch = Branch::create($data);
        
        if (empty($branch->code)) {
            $branch->code = 'SUC-' . str_pad($branch->id, 3, '0', STR_PAD_LEFT);
            $branch->save();
        }

        return redirect()->route('branches.index')->with('success', 'Sucursal creada exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Branch $branch)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Branch $branch)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateBranchRequest $request, Branch $branch)
    {
        $branch->update($request->validated());

        return redirect()->route('branches.index')->with('success', 'Sucursal actualizada exitosamente.');
    }

    /**
     * Remove the specified resource from storage (soft delete via status).
     */
    public function destroy(Branch $branch)
    {
        $branch->update(['status' => $branch->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE']);

        $message = $branch->status === 'ACTIVE' ? 'Sucursal reactivada exitosamente.' : 'Sucursal desactivada exitosamente.';

        return redirect()->route('branches.index')->with('success', $message);
    }
}
